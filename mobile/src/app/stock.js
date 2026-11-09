import { useState } from 'react';
import { ScrollView, Switch, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useApi, useDebounce } from '../lib/hooks';
import { useAuth } from '../lib/auth';
import { money, moneyShort, number } from '../lib/format';
import { MATERIAL_CATEGORIES } from '../lib/constants';
import { REF } from '../config/resources';
import { RefPicker, SelectPicker } from '../components/Form';
import { Badge, Button, C, Card, Empty, Grid, Loader, Screen, SearchBar, StatCard } from '../components/ui';
import { formHref, listHref } from '../lib/nav';

/** Warehouse and site-wise stock summary with low-stock alerts */
export default function Stock() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { can } = useAuth();
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState(params.location || '');
  const [q, setQ] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const dq = useDebounce(q);
  const loc = location === null ? 'warehouse' : location;
  const { data, isLoading, refetch, isRefetching } = useApi('/stock/summary', { category: category || undefined, location: loc || undefined, q: dq || undefined });
  const all = data?.items || [];
  const rows = all.filter((r) => !lowOnly || r.low);

  return (
    <Screen onRefresh={refetch} refreshing={isRefetching}>
      <Grid>
        <StatCard label="Materials in stock" value={all.filter((r) => r.total > 0).length} icon="cube-outline" tone="blue" />
        <StatCard label="Stock value" value={moneyShort(all.reduce((s, r) => s + r.value, 0))} icon="cash-outline" tone="green" />
        <StatCard label="Warehouse items" value={all.filter((r) => r.warehouse > 0).length} icon="business-outline" tone="violet" />
        <StatCard label="Low-stock alerts" value={all.filter((r) => r.low).length} icon="warning-outline" tone="red" />
      </Grid>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
        <Button small variant="secondary" icon="swap-horizontal-outline" title="Movements" onPress={() => router.push(listHref('stockTxns'))} style={{ flex: 1 }} />
        {can('stock', 'edit') && <Button small icon="add" title="Record movement" onPress={() => router.push(formHref('stockTxns'))} style={{ flex: 1 }} />}
      </View>

      <View style={{ gap: 8, marginTop: 12 }}>
        <SearchBar value={q} onChangeText={setQ} placeholder="Search material…" />
        <SelectPicker label="Category" options={MATERIAL_CATEGORIES} value={category} onChange={setCategory} allowEmpty placeholder="All categories" />
        <RefPicker label="Location" refDef={{ ...REF.project, nullLabel: 'Main Warehouse' }} value={location} onChange={(v) => setLocation(v)} placeholder="All locations" />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: C.text2 }}>Low stock only</Text>
          <Switch value={lowOnly} onValueChange={setLowOnly} trackColor={{ true: C.gold, false: C.border }} thumbColor="#fff" />
        </View>
      </View>

      {isLoading ? <Loader /> : !rows.length ? <Empty icon="layers-outline" title="No materials match" /> : rows.map((r) => (
        <Card key={r._id} style={[{ marginTop: 8 }, r.low && { borderColor: '#fecaca', backgroundColor: '#fff7f7' }]}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '600', color: C.text }}>{r.name}</Text>
              <Text style={{ fontSize: 12, color: C.text2 }}>{r.code} · {r.category}{r.brand ? ` · ${r.brand}` : ''}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontWeight: '800', color: C.text, fontSize: 16 }}>{number(r.total)} <Text style={{ fontWeight: '400', fontSize: 12, color: C.text2 }}>{r.unit}</Text></Text>
              <Text style={{ fontSize: 12, color: C.muted }}>{money(r.value)}{r.minStock ? ` · min ${number(r.minStock)}` : ''}</Text>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginTop: 8 }}>
            {r.low ? <Badge tone="red">Low stock</Badge> : r.total > 0 ? <Badge tone="green">OK</Badge> : <Badge tone="slate">Empty</Badge>}
            {r.locations.map((l) => <Badge key={l.location} tone={l.location === 'warehouse' ? 'violet' : 'slate'}>{l.locationName.split(' · ').pop()}: {number(l.quantity)}</Badge>)}
          </ScrollView>
        </Card>
      ))}
    </Screen>
  );
}
