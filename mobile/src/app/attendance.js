import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '../lib/auth';
import { useAction, useApi } from '../lib/hooks';
import { money, today } from '../lib/format';
import { REF } from '../config/resources';
import { DateInput, RefPicker } from '../components/Form';
import { Badge, Button, C, Card, Empty, Field, Grid, Input, Loader, Screen, StatCard } from '../components/ui';

const OPTIONS = [
  { v: 'Present', short: 'P', bg: '#059669' },
  { v: 'Half Day', short: 'H', bg: '#f59e0b' },
  { v: 'Absent', short: 'A', bg: '#ef4444' },
];

/** Daily muster roll for a site: P / H / A + OT hours per worker */
export default function Attendance() {
  const params = useLocalSearchParams();
  const { can } = useAuth();
  const [project, setProject] = useState(params.project || '');
  const [date, setDate] = useState(today());
  const [marks, setMarks] = useState({});
  const action = useAction();
  const canEdit = can('attendance', 'edit');
  const { data, isLoading } = useApi(project ? '/attendance/sheet' : null, { project, date });
  const rows = data?.rows || [];

  useEffect(() => {
    if (!data) return;
    const m = {};
    for (const r of data.rows) {
      const a = r.attendance;
      if (a && String(a.project) !== project) continue;
      if (a || String(r.worker.currentProject?._id) === project) m[r.worker._id] = { status: a?.status || '', otHours: a?.otHours || 0 };
    }
    setMarks(m);
  }, [data, project]);

  const stats = useMemo(() => {
    const vals = Object.entries(marks).filter(([, m]) => m.status);
    const wage = vals.reduce((s, [id, m]) => {
      const w = rows.find((r) => r.worker._id === id)?.worker;
      if (!w) return s;
      const d = m.status === 'Present' ? 1 : m.status === 'Half Day' ? 0.5 : 0;
      return s + d * w.dailyWage + (m.status === 'Absent' ? 0 : (Number(m.otHours) || 0) * (w.otRate || 0));
    }, 0);
    return { present: vals.filter(([, m]) => m.status === 'Present').length, half: vals.filter(([, m]) => m.status === 'Half Day').length, absent: vals.filter(([, m]) => m.status === 'Absent').length, wage };
  }, [marks, rows]);

  const set = (id, patch) => setMarks((m) => ({ ...m, [id]: { status: '', otHours: 0, ...m[id], ...patch } }));
  const markAll = (status) => {
    const m = { ...marks };
    for (const r of rows) {
      const elsewhere = r.attendance && String(r.attendance.project) !== project;
      if (!elsewhere && (String(r.worker.currentProject?._id) === project || m[r.worker._id])) m[r.worker._id] = { otHours: 0, ...m[r.worker._id], status };
    }
    setMarks(m);
  };
  const save = () => action.mutate({
    url: '/attendance/bulk',
    body: { project, date, entries: Object.entries(marks).filter(([, m]) => m.status).map(([worker, m]) => ({ worker, ...m, otHours: Number(m.otHours) || 0 })) },
    success: 'Attendance saved',
  });

  // Workers assigned to this site first, then the rest
  const sorted = [...rows].sort((a, b) => (String(b.worker.currentProject?._id) === project) - (String(a.worker.currentProject?._id) === project));

  return (
    <Screen footer={project && canEdit && rows.length ? <>
      <Button title="All present" variant="secondary" onPress={() => markAll('Present')} style={{ flex: 1 }} />
      <Button title="Save attendance" icon="save-outline" onPress={save} loading={action.isPending} style={{ flex: 1.4 }} />
    </> : null}>
      <Card>
        <Field label="Site / project">
          <RefPicker label="Site" refDef={REF.project} params={{ status: 'Ongoing,Planning' }} value={project} onChange={(v) => setProject(v || '')} placeholder="Select site" />
        </Field>
        <Field label="Date"><DateInput value={date} onChange={(v) => setDate(v || today())} /></Field>
      </Card>

      {!project ? <Empty icon="calendar-outline" title="Select a site to mark attendance" description="Workers assigned to the site are listed first. You can also mark workers from other sites." />
        : isLoading ? <Loader /> : (
          <>
            <View style={{ marginTop: 12 }}>
              <Grid>
                <StatCard label="Present" value={stats.present} icon="person-outline" tone="green" />
                <StatCard label="Half day" value={stats.half} icon="people-outline" tone="amber" />
                <StatCard label="Absent" value={stats.absent} icon="person-remove-outline" tone="red" />
                <StatCard label="Wages today" value={money(stats.wage)} icon="cash-outline" tone="brand" />
              </Grid>
            </View>
            {!rows.length && <Empty icon="hammer-outline" title="No workers yet" description="Add workers in Workforce → Workers." />}
            {sorted.map(({ worker: w, attendance: a }) => {
              const elsewhere = a && String(a.project) !== project;
              const m = marks[w._id] || {};
              const here = String(w.currentProject?._id) === project;
              return (
                <Card key={w._id} style={[{ marginTop: 8 }, !here && !m.status && { opacity: 0.65 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '600', color: C.text }}>{w.name}</Text>
                      <Text style={{ fontSize: 12, color: C.text2 }}>{w.code} · {w.trade} · {money(w.dailyWage)}/day</Text>
                      {!here && <Text style={{ fontSize: 11, color: C.muted }}>{w.currentProject ? `Assigned: ${w.currentProject.name}` : 'Not assigned to a site'}</Text>}
                    </View>
                    {elsewhere ? <Badge tone="slate">Marked at another site</Badge> : (
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {OPTIONS.map((o) => {
                          const on = m.status === o.v;
                          return (
                            <Pressable key={o.v} disabled={!canEdit} onPress={() => set(w._id, { status: on ? '' : o.v })}
                              style={[st.opt, on && { backgroundColor: o.bg, borderColor: o.bg }]}>
                              <Text style={[st.optText, on && { color: '#fff' }]}>{o.short}</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    )}
                  </View>
                  {!elsewhere && ['Present', 'Half Day'].includes(m.status) && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
                      <Text style={{ fontSize: 13, color: C.text2 }}>OT hours</Text>
                      <Input value={String(m.otHours ?? 0)} onChangeText={(t) => set(w._id, { otHours: t.replace(/[^0-9.]/g, '') })} keyboardType="decimal-pad" editable={canEdit} style={{ width: 80, minHeight: 36 }} />
                      {w.otRate ? <Text style={{ fontSize: 12, color: C.muted }}>@ {money(w.otRate)}/hr</Text> : null}
                    </View>
                  )}
                </Card>
              );
            })}
          </>
        )}
    </Screen>
  );
}

const st = StyleSheet.create({
  opt: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  optText: { fontSize: 14, fontWeight: '800', color: C.text2 },
});
