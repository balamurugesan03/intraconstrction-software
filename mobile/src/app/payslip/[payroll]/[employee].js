import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useApi } from '../../../lib/hooks';
import { money, monthLabel, number } from '../../../lib/format';
import { SummaryBox } from '../../../components/Form';
import { C, Card, ErrorView, KeyValue, Loader, Screen, SectionTitle, StatusBadge } from '../../../components/ui';

export default function Payslip() {
  const { payroll, employee } = useLocalSearchParams();
  const { data, isLoading, error, refetch } = useApi(`/payslips/${payroll}/${employee}`);
  if (isLoading) return <Loader />;
  if (error) return <ErrorView error={error} onRetry={refetch} />;
  const { line: l, employee: e } = data;

  return (
    <Screen>
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: C.text }}>{monthLabel(data.month)}</Text>
          <StatusBadge value={data.status} />
        </View>
        <Text style={{ color: C.text2, marginTop: 2 }}>{e?.name || l.name} · {e?.code || l.code}</Text>
        <Text style={{ color: C.muted, fontSize: 12 }}>{[l.designation || e?.designation, l.department || e?.department].filter(Boolean).join(' · ')}</Text>
        <Text style={{ fontSize: 28, fontWeight: '800', color: C.brandDark, marginTop: 12 }}>{money(l.net)}</Text>
        <Text style={{ color: C.muted, fontSize: 12 }}>Net pay · {data.code}</Text>
      </Card>

      <SectionTitle>Attendance</SectionTitle>
      <Card style={{ paddingVertical: 4 }}>
        <KeyValue label="Days in month" value={number(l.monthDays)} />
        <KeyValue label="Present days" value={number(l.presentDays)} />
        <KeyValue label="Paid leave" value={number(l.paidLeave)} />
        <KeyValue label="Loss of pay days" value={number(l.lopDays)} />
        <KeyValue label="Payable days" value={number(l.payableDays)} />
      </Card>

      <SectionTitle>Earnings</SectionTitle>
      <SummaryBox items={[
        { label: 'Basic', value: money(l.basic, true) }, { label: 'HRA', value: money(l.hra, true) },
        { label: 'Other allowances', value: money(l.allowances, true) }, l.bonus ? { label: 'Bonus', value: money(l.bonus, true) } : null,
        { label: 'Gross earnings', value: money(l.gross, true), strong: true },
      ].filter(Boolean)} />

      <SectionTitle>Deductions</SectionTitle>
      <SummaryBox items={[
        { label: 'PF', value: money(l.pf, true) }, { label: 'ESI', value: money(l.esi, true) }, { label: 'Professional tax', value: money(l.pt, true) },
        l.advance ? { label: 'Advance recovery', value: money(l.advance, true) } : null,
        l.otherDeduction ? { label: 'Other deductions', value: money(l.otherDeduction, true) } : null,
        { label: 'Total deductions', value: money(l.deductions, true), strong: true },
      ].filter(Boolean)} />
    </Screen>
  );
}
