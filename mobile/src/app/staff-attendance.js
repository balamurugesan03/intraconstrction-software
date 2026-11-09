import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { useAction, useApi } from '../lib/hooks';
import { today } from '../lib/format';
import { DateInput } from '../components/Form';
import { Badge, Button, C, Card, Empty, Field, Grid, Input, Loader, Screen, StatCard } from '../components/ui';

const OPTIONS = [
  { v: 'Present', short: 'P', bg: '#059669' },
  { v: 'Half Day', short: 'H', bg: '#f59e0b' },
  { v: 'Absent', short: 'A', bg: '#ef4444' },
  { v: 'Week Off', short: 'W', bg: '#64748b' },
  { v: 'Holiday', short: 'HD', bg: '#0891b2' },
];

/** Daily muster for office / site staff (employees). Leave days come from approved leave. */
export default function StaffAttendance() {
  const { can } = useAuth();
  const [date, setDate] = useState(today());
  const [marks, setMarks] = useState({});
  const action = useAction();
  const { data, isLoading } = useApi('/staff-attendance/sheet', { date });
  const canEdit = can('staffAttendance', 'edit');
  const rows = data?.rows || [];

  useEffect(() => {
    if (!data) return;
    setMarks(Object.fromEntries(data.rows.filter((r) => r.attendance && !r.attendance.leave).map((r) => [r.employee._id, {
      status: r.attendance.status, checkIn: r.attendance.checkIn || '', checkOut: r.attendance.checkOut || '',
    }])));
  }, [data]);

  const stats = useMemo(() => {
    const vals = Object.values(marks);
    return {
      present: vals.filter((m) => m.status === 'Present').length,
      half: vals.filter((m) => m.status === 'Half Day').length,
      absent: vals.filter((m) => m.status === 'Absent').length,
      leave: rows.filter((r) => r.attendance?.leave).length,
    };
  }, [marks, rows]);

  const set = (id, patch) => setMarks((m) => ({ ...m, [id]: { status: '', checkIn: '', checkOut: '', ...m[id], ...patch } }));
  const markAll = (status) => setMarks((m) => {
    const next = { ...m };
    for (const r of rows) if (!r.attendance?.leave && !next[r.employee._id]?.status) next[r.employee._id] = { checkIn: '', checkOut: '', ...next[r.employee._id], status };
    return next;
  });
  const save = () => action.mutate({
    url: '/staff-attendance/bulk',
    body: { date, entries: Object.entries(marks).filter(([, m]) => m.status).map(([employee, m]) => ({ employee, ...m })) },
    success: 'Attendance saved',
  });

  return (
    <Screen footer={canEdit && rows.length ? <>
      <Button title="Unmarked → P" variant="secondary" onPress={() => markAll('Present')} style={{ flex: 1 }} />
      <Button title="Save" icon="save-outline" onPress={save} loading={action.isPending} style={{ flex: 1 }} />
    </> : null}>
      <Card><Field label="Date"><DateInput value={date} onChange={(v) => setDate(v || today())} /></Field></Card>
      {isLoading ? <Loader /> : !rows.length ? <Empty icon="time-outline" title="No employees yet" description="Add staff in HR → Employees to start the muster roll." /> : (
        <>
          <View style={{ marginTop: 12 }}>
            <Grid>
              <StatCard label="Present" value={stats.present} icon="person-outline" tone="green" />
              <StatCard label="Half day" value={stats.half} icon="people-outline" tone="amber" />
              <StatCard label="Absent" value={stats.absent} icon="person-remove-outline" tone="red" />
              <StatCard label="On leave" value={stats.leave} icon="calendar-clear-outline" tone="violet" />
            </Grid>
          </View>
          {rows.map(({ employee: e, attendance: a }) => {
            const m = marks[e._id] || {};
            const working = ['Present', 'Half Day'].includes(m.status);
            return (
              <Card key={e._id} style={{ marginTop: 8 }}>
                <Text style={{ fontWeight: '600', color: C.text }}>{e.name}</Text>
                <Text style={{ fontSize: 12, color: C.text2, marginBottom: 8 }}>{[e.code, e.designation, e.department].filter(Boolean).join(' · ')}</Text>
                {a?.leave ? <Badge tone="violet">{a.leave.leaveType}{a.leave.halfDay ? ' (half)' : ''} · {a.leave.code}</Badge> : (
                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                    {OPTIONS.map((o) => {
                      const on = m.status === o.v;
                      return (
                        <Pressable key={o.v} disabled={!canEdit} onPress={() => set(e._id, { status: on ? '' : o.v })} style={[st.opt, on && { backgroundColor: o.bg, borderColor: o.bg }]}>
                          <Text style={[st.optText, on && { color: '#fff' }]}>{o.short}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
                {!a?.leave && working && (
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, color: C.text2 }}>In</Text>
                    <Input value={m.checkIn || ''} onChangeText={(t) => set(e._id, { checkIn: t })} placeholder="09:30" editable={canEdit} style={{ flex: 1, minHeight: 36 }} keyboardType="numbers-and-punctuation" />
                    <Text style={{ fontSize: 13, color: C.text2 }}>Out</Text>
                    <Input value={m.checkOut || ''} onChangeText={(t) => set(e._id, { checkOut: t })} placeholder="18:30" editable={canEdit} style={{ flex: 1, minHeight: 36 }} keyboardType="numbers-and-punctuation" />
                  </View>
                )}
              </Card>
            );
          })}
          <Text style={{ fontSize: 12, color: C.muted, marginTop: 12 }}>Leave days come from approved leave applications. Unmarked days are treated as working days in payroll; only Absent, half of a Half Day and Loss-of-Pay leave reduce salary.</Text>
        </>
      )}
    </Screen>
  );
}

const st = StyleSheet.create({
  opt: { minWidth: 44, height: 40, paddingHorizontal: 8, borderRadius: 10, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  optText: { fontSize: 13, fontWeight: '800', color: C.text2 },
});
