import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useApi } from '../lib/hooks';
import { fmtDate, money, number } from '../lib/format';
import { REF } from '../config/resources';
import { DateInput, RefPicker } from '../components/Form';
import { C, Card, Chip, Empty, ErrorView, Loader, Screen, SectionTitle } from '../components/ui';

const REPORTS = [
  { key: 'profit-loss', label: 'Profit / Loss', filters: ['project'] },
  { key: 'project-progress', label: 'Project Progress', filters: ['project'] },
  { key: 'project-cost', label: 'Project Cost', filters: ['project'] },
  { key: 'budget-vs-actual', label: 'Budget vs Actual', filters: ['project'] },
  { key: 'material-consumption', label: 'Material Consumption', filters: ['project', 'date'] },
  { key: 'material-wastage', label: 'Material Wastage', filters: ['project', 'date'] },
  { key: 'labour-cost', label: 'Labour Cost', filters: ['project', 'date'] },
  { key: 'purchase', label: 'Purchase', filters: ['project', 'date'] },
  { key: 'vendor-outstanding', label: 'Vendor Outstanding', filters: [] },
  { key: 'client-outstanding', label: 'Client Outstanding', filters: [] },
  { key: 'contractor', label: 'Contractor', filters: [] },
  { key: 'site-performance', label: 'Site Performance', filters: ['project'] },
  { key: 'payments', label: 'Payments', filters: ['project', 'date'] },
];

const cell = (c, v) => {
  if (v == null || v === '') return '—';
  if (c.type === 'currency') return money(v);
  if (c.type === 'number') return number(v);
  if (c.type === 'percent') return `${number(v)}%`;
  if (c.type === 'date') return fmtDate(v);
  return String(v);
};

/** Each report row becomes a card: first column is the title, the rest are label: value pairs */
export default function Reports() {
  const [key, setKey] = useState(REPORTS[0].key);
  const meta = REPORTS.find((r) => r.key === key);
  const [project, setProject] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const query = { project: meta.filters.includes('project') ? project || undefined : undefined, ...(meta.filters.includes('date') ? { from: from || undefined, to: to || undefined } : {}) };
  const { data, isLoading, error, refetch, isRefetching } = useApi(`/reports/${key}`, query);

  return (
    <Screen onRefresh={refetch} refreshing={isRefetching}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
        {REPORTS.map((r) => <Chip key={r.key} label={r.label} active={r.key === key} onPress={() => setKey(r.key)} />)}
      </ScrollView>

      {meta.filters.length > 0 && (
        <Card style={{ gap: 8, marginBottom: 4 }}>
          {meta.filters.includes('project') && <RefPicker label="Project" refDef={REF.project} value={project} onChange={(v) => setProject(v || '')} placeholder="All projects" />}
          {meta.filters.includes('date') && (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}><Text style={{ fontSize: 12, color: C.text2, marginBottom: 4 }}>From</Text><DateInput value={from} onChange={setFrom} /></View>
              <View style={{ flex: 1 }}><Text style={{ fontSize: 12, color: C.text2, marginBottom: 4 }}>To</Text><DateInput value={to} onChange={setTo} /></View>
            </View>
          )}
        </Card>
      )}

      {isLoading ? <Loader /> : error ? <ErrorView error={error} onRetry={refetch} /> : !data?.rows?.length ? <Empty icon="bar-chart-outline" title="No data for the selected filters" /> : (
        <>
          <SectionTitle>{data.title || meta.label} · {data.rows.length} rows</SectionTitle>
          {Object.keys(data.totals || {}).length > 0 && (
            <Card style={{ backgroundColor: C.brandLight, borderColor: C.brandSoft, marginBottom: 8 }}>
              <Text style={{ fontWeight: '700', color: C.brandDark, marginBottom: 4 }}>Totals</Text>
              {data.columns.filter((c) => c.key in data.totals).map((c) => (
                <View key={c.key} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 }}>
                  <Text style={{ color: C.text2 }}>{c.label}</Text>
                  <Text style={{ fontWeight: '700', color: Number(data.totals[c.key]) < 0 ? C.danger : C.text }}>{c.type === 'currency' ? money(data.totals[c.key]) : number(data.totals[c.key])}</Text>
                </View>
              ))}
            </Card>
          )}
          {data.rows.map((r, i) => {
            const [first, ...rest] = data.columns;
            return (
              <Card key={i} style={{ marginBottom: 8 }}>
                <Text style={{ fontWeight: '600', color: C.text, marginBottom: 4 }}>{cell(first, r[first.key])}</Text>
                {rest.map((c) => (
                  <View key={c.key} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2, gap: 12 }}>
                    <Text style={{ color: C.text2, fontSize: 13 }}>{c.label}</Text>
                    <Text style={{ fontSize: 13, color: c.type === 'currency' && Number(r[c.key]) < 0 ? C.danger : C.text, flexShrink: 1, textAlign: 'right' }}>{cell(c, r[c.key])}</Text>
                  </View>
                ))}
              </Card>
            );
          })}
          <Text style={{ fontSize: 11, color: C.muted, textAlign: 'center' }}>Generated {fmtDate(data.generatedAt, 'dd MMM yyyy, hh:mm a')}</Text>
        </>
      )}
    </Screen>
  );
}
