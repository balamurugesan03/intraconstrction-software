import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApi } from '../lib/hooks';
import { toHref } from '../lib/nav';
import { C, Card, ErrorView, Loader, Screen, SectionTitle } from '../components/ui';

/** Lead → Project → Billing funnel with live counts; each step opens its list */
export default function Workflow() {
  const router = useRouter();
  const { data, isLoading, error, refetch, isRefetching } = useApi('/dashboard/pipeline');
  if (isLoading) return <Loader />;
  if (error) return <ErrorView error={error} onRetry={refetch} />;

  return (
    <Screen onRefresh={refetch} refreshing={isRefetching}>
      <Text style={{ color: C.text2, marginBottom: 12 }}>Every enquiry moves through these steps. Tap a step to open it.</Text>
      {data.stages.map((s, i) => (
        <View key={s.key}>
          <Card onPress={s.to ? () => router.push(toHref(s.to)) : undefined} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: C.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontWeight: '800', color: C.brandDark }}>{i + 1}</Text>
            </View>
            <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: C.text }}>{s.label}</Text>
            <Text style={{ fontSize: 20, fontWeight: '800', color: C.text }}>{s.count ?? '—'}</Text>
            <Ionicons name="chevron-forward" size={16} color={C.muted} />
          </Card>
          {i < data.stages.length - 1 && <View style={{ alignItems: 'center', paddingVertical: 2 }}><Ionicons name="arrow-down" size={16} color={C.gold} /></View>}
        </View>
      ))}
      {data.leadStatus?.length > 0 && (
        <>
          <SectionTitle>Leads by status</SectionTitle>
          <Card>
            {data.leadStatus.map((l) => (
              <View key={l.name} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                <Text style={{ color: C.text2 }} onPress={() => router.push(toHref(`/leads?status=${l.name}`))}>{l.name}</Text>
                <Text style={{ fontWeight: '700', color: C.text }}>{l.value}</Text>
              </View>
            ))}
          </Card>
        </>
      )}
    </Screen>
  );
}
