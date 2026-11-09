import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApi } from '../../lib/hooks';
import { fmtDate } from '../../lib/format';
import { toHref } from '../../lib/nav';
import { Badge, C, Card, Chip, Empty, ErrorView, Loader, Screen } from '../../components/ui';

const ICON = { task: 'checkbox-outline', bill: 'wallet-outline', stock: 'layers-outline', deadline: 'flag-outline', quote: 'document-text-outline', design: 'bed-outline', mr: 'cart-outline', po: 'cart-outline', lead: 'call-outline', mb: 'resize-outline' };
const SEV = { high: '#dc2626', medium: '#f59e0b', low: '#cbd5e1' };

export default function Alerts() {
  const router = useRouter();
  const { data, isLoading, error, refetch, isRefetching } = useApi('/notifications');
  const [cat, setCat] = useState('All');
  const items = data?.items || [];
  const cats = ['All', ...new Set(items.map((i) => i.category))];
  const shown = cat === 'All' ? items : items.filter((i) => i.category === cat);

  return (
    <Screen onRefresh={refetch} refreshing={isRefetching}>
      {isLoading ? <Loader /> : error ? <ErrorView error={error} onRetry={refetch} /> : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
            {cats.map((c) => <Chip key={c} label={c} count={c === 'All' ? items.length : items.filter((i) => i.category === c).length} active={cat === c} onPress={() => setCat(c)} />)}
          </ScrollView>
          {shown.length ? shown.map((n) => (
            <Card key={n.id} onPress={n.link ? () => router.push(toHref(n.link)) : undefined} style={{ marginBottom: 8, borderLeftWidth: 4, borderLeftColor: SEV[n.severity] || SEV.low, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <Ionicons name={ICON[n.type] || 'notifications-outline'} size={22} color={SEV[n.severity] === SEV.low ? C.text2 : SEV[n.severity]} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '600', color: C.text }} numberOfLines={2}>{n.title}</Text>
                <Text style={{ fontSize: 13, color: C.text2, marginTop: 2 }} numberOfLines={3}>{n.message}</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, alignItems: 'center' }}>
                  <Badge tone={n.severity === 'high' ? 'red' : n.severity === 'medium' ? 'amber' : 'slate'}>{n.category}</Badge>
                  <Text style={{ fontSize: 11, color: C.muted }}>{fmtDate(n.date, 'dd MMM')}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={C.muted} />
            </Card>
          )) : <Empty icon="notifications-off-outline" title="You're all caught up" description="No pending reminders right now." />}
        </>
      )}
    </Screen>
  );
}
