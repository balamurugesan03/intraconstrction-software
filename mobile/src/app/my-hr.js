import { Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useApi } from '../lib/hooks';
import { fmtDate, money, monthLabel, number } from '../lib/format';
import { formHref, listHref } from '../lib/nav';
import { MyLeaveBalance } from '../components/resourceHelpers';
import { Button, C, Card, Empty, ErrorView, KeyValue, ListRow, Loader, Screen, SectionTitle, StatusBadge } from '../components/ui';

/** Employee self-service: profile, leave balance, leave history and payslips */
export default function MyHR() {
  const router = useRouter();
  const { data, isLoading, error, refetch, isRefetching } = useApi('/payslips');
  if (isLoading) return <Loader />;
  if (error) return <ErrorView error={error} onRetry={refetch} />;
  const e = data?.employee;
  if (!e) return <Empty icon="person-circle-outline" title="No employee profile linked" description="Ask HR to link your login to your employee record to apply for leave and see payslips." />;

  return (
    <Screen onRefresh={refetch} refreshing={isRefetching}>
      <Card>
        <Text style={{ fontSize: 18, fontWeight: '700', color: C.text }}>{e.name}</Text>
        <Text style={{ color: C.text2, marginBottom: 6 }}>{e.code} · {e.designation || ''}</Text>
        <KeyValue label="Department" value={e.department} />
        <KeyValue label="Joined" value={fmtDate(e.joiningDate)} />
        <KeyValue label="Phone" value={e.phone} />
        <KeyValue label="Email" value={e.email} />
      </Card>

      <SectionTitle>Leave balance · {new Date().getFullYear()}</SectionTitle>
      <MyLeaveBalance />
      <Button title="Apply leave" icon="calendar-clear-outline" onPress={() => router.push(formHref('leaves'))} />
      <Button title="My leave history" variant="secondary" onPress={() => router.push(listHref('leaves', { employee: e._id }))} style={{ marginTop: 8 }} />

      <SectionTitle>Payslips</SectionTitle>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {data.items.length ? data.items.map((s) => (
          <ListRow key={s.payroll} icon="document-text-outline" label={monthLabel(s.month)}
            sub={`${number(s.line.payableDays)} paid day(s) · gross ${money(s.line.gross)} · net ${money(s.line.net)}`}
            right={<StatusBadge value={s.status} />}
            onPress={() => router.push(`/payslip/${s.payroll}/${e._id}`)} />
        )) : <Text style={{ padding: 16, color: C.muted, textAlign: 'center' }}>No payslips yet</Text>}
      </Card>
    </Screen>
  );
}
