import { ScrollView, Text, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { useApi } from '../lib/hooks';
import { number } from '../lib/format';
import { C, Card } from './ui';

/** Extra ctx values some configs need (leave approvals depend on who you are) */
export function useCtxExtra(key) {
  const { isAdmin, role } = useAuth();
  const { data } = useApi(key === 'leaves' ? '/leaves/balance' : null, undefined, { retry: false });
  return key === 'leaves' ? { isHR: isAdmin || role === 'HR Manager', myEmployee: data?.employee?._id } : {};
}

/** Role-dependent form fields (same rules as the web pages) */
export function useFieldsFor(config) {
  const { can, isExternal } = useAuth();
  return config.fields.filter((f) => !(f.hrOnly && !can('employees')) && !(f.staffOnly && isExternal));
}

/** Split route params into list filters and locked ("fixed") filters */
export function splitParams(params) {
  const { key, fixed, id, title, ...rest } = params;
  const fixedKeys = fixed ? String(fixed).split(',').filter(Boolean) : [];
  const fixedObj = {};
  const initial = {};
  for (const [k, v] of Object.entries(rest)) {
    if (v == null || v === '') continue;
    if (fixedKeys.includes(k)) fixedObj[k] = v;
    else initial[k] = v;
  }
  return { key, id, fixed: fixedObj, initial, fixedKeys };
}

/** Remaining / taken days per leave type for the current year (own profile) */
export function MyLeaveBalance() {
  const { data, error } = useApi('/leaves/balance', undefined, { retry: false });
  if (error) return <Card style={{ marginBottom: 12 }}><Text style={{ color: C.text2, fontSize: 13 }}>{error.response?.data?.message || 'Leave balance unavailable'}</Text></Card>;
  if (!data) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
      {data.balance.map((b) => (
        <Card key={b.type} style={{ width: 140, padding: 12 }}>
          <Text style={{ fontSize: 12, color: C.text2 }} numberOfLines={1}>{b.type}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
            <Text style={{ fontSize: 22, fontWeight: '700', color: C.text }}>{number(b.quota == null ? b.taken : b.balance)}</Text>
            <Text style={{ fontSize: 11, color: C.muted }}>{b.quota == null ? 'taken' : `of ${b.quota} left`}</Text>
          </View>
          <Text style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{b.quota == null ? 'No yearly limit' : `${number(b.taken)} taken`}{b.pending ? ` · ${number(b.pending)} pending` : ''}</Text>
        </Card>
      ))}
    </ScrollView>
  );
}
