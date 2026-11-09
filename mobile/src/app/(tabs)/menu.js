import { useState } from 'react';
import { Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { toHref } from '../../lib/nav';
import { MENU } from '../../config/menu';
import { C, Card, Empty, ListRow, Screen, SearchBar, SectionTitle } from '../../components/ui';

export default function Menu() {
  const { can } = useAuth();
  const router = useRouter();
  const [q, setQ] = useState('');
  const groups = MENU.map((g) => ({
    ...g,
    items: g.items.filter((i) => can(i.module, 'menu') && (!q || i.label.toLowerCase().includes(q.toLowerCase()))),
  })).filter((g) => g.items.length);

  return (
    <Screen>
      <SearchBar value={q} onChangeText={setQ} placeholder="Find a module…" />
      {groups.map((g) => (
        <Card key={g.group} style={{ padding: 0, overflow: 'hidden', marginTop: 12 }}>
          <SectionTitle style={{ marginHorizontal: 16, marginTop: 14, marginBottom: 2 }}>{g.group}</SectionTitle>
          {g.items.map((i) => <ListRow key={i.to} icon={i.icon} label={i.label} onPress={() => router.push(toHref(i.to))} />)}
        </Card>
      ))}
      {!groups.length && <Empty title="Nothing found" description={q ? 'Try another word.' : 'Your role has no modules assigned.'} />}
      <Text style={{ textAlign: 'center', color: C.muted, fontSize: 12, marginTop: 20 }}>Only modules allowed for your role are shown.</Text>
    </Screen>
  );
}
