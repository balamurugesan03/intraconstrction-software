import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Badge, C, Chip, Empty, ErrorView, Progress, SearchBar, Sheet, StatusBadge } from './ui';
import { ActionSheet, useCtx } from './Prompt';
import { get, fileUrl } from '../lib/api';
import { isImage } from '../lib/format';
import { useAuth } from '../lib/auth';
import { useDebounce } from '../lib/hooks';
import { detailHref, formHref } from '../lib/nav';
import { TONES } from '../lib/theme';

/** Card for one record, driven by config.card(r) */
export function RecordCard({ config, row, onPress, onLongPress, onMore }) {
  const c = config.card(row);
  const meta = (c.meta || []).filter(Boolean);
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} style={({ pressed }) => [st.card, pressed && { opacity: 0.8 }]}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {c.image && isImage(c.image) ? <Image source={{ uri: fileUrl(c.image) }} style={st.img} /> : null}
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <Text style={st.title} numberOfLines={2}>{c.title || '—'}</Text>
            {c.amount ? <Text style={[st.amount, c.amountTone && { color: TONES[c.amountTone]?.fg }]} numberOfLines={1}>{c.amount}</Text> : null}
          </View>
          {c.sub ? <Text style={st.sub} numberOfLines={1}>{c.sub}</Text> : null}
          {meta.length ? <Text style={st.meta} numberOfLines={2}>{meta.join('  ·  ')}</Text> : null}
          {c.progress != null ? <Progress value={c.progress} style={{ marginTop: 8 }} /> : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 }}>
            {c.badge ? <Badge tone={c.badge.tone}>{c.badge.text}</Badge> : <StatusBadge value={c.status} />}
            <View style={{ flex: 1 }} />
            {onMore ? <Pressable onPress={onMore} hitSlop={12} style={{ padding: 2 }}><Ionicons name="ellipsis-horizontal" size={18} color={C.muted} /></Pressable> : null}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

/** Row actions shared by the list (long-press / ⋯) and detail screens */
export function useRowActions(config, ctx) {
  const { can } = useAuth();
  const canEdit = can(config.module, 'edit') && config.editable !== false;
  const router = useRouter();
  return (row, { includeEdit = true } = {}) => [
    ...(config.rowActions?.(row, ctx) || []),
    includeEdit && canEdit && config.canEditRow?.(row) !== false && { label: 'Edit', icon: 'create-outline', onClick: () => router.push(formHref(config.key, { id: row._id })) },
  ].filter(Boolean);
}

/**
 * Searchable, filterable, paginated list for a resource.
 *  initial: filters from the route (user can clear them)
 *  fixed:   filters locked by the caller (e.g. { project } in project detail) — also pre-filled on create
 */
export default function ResourceList({ config, initial = {}, fixed = {}, ctxExtra = {}, header }) {
  const router = useRouter();
  const { can } = useAuth();
  const ctx = useCtx(ctxExtra);
  const rowActions = useRowActions(config, ctx);
  const [q, setQ] = useState('');
  const dq = useDebounce(q, 350);
  const [filters, setFilters] = useState(initial);
  const [actionsFor, setActionsFor] = useState(null);
  const [editingFilter, setEditingFilter] = useState(null);

  const query = { q: dq || undefined, limit: config.pageSize || 25, ...filters, ...fixed };
  const res = useInfiniteQuery({
    queryKey: [config.endpoint, 'list', query],
    queryFn: ({ pageParam }) => get(config.endpoint, { ...query, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.pages ? last.page + 1 : undefined),
  });
  const rows = useMemo(() => res.data?.pages.flatMap((p) => p.items) || [], [res.data]);
  const total = res.data?.pages[0]?.total;

  const canCreate = can(config.module, 'edit') && config.creatable !== false && config.editable !== false;
  const visibleFilters = (config.filters || []).filter((f) => !(f.name in fixed) && (!f.ref?.module || can(f.ref.module)) && (!f.hidden || filters[f.name]));
  const extraFilterKeys = Object.keys(filters).filter((k) => filters[k] && !(config.filters || []).some((f) => f.name === k));

  const filterLabel = (f) => {
    const v = filters[f.name];
    if (!v) return f.label;
    if (f.options) {
      const o = f.options.find((x) => (typeof x === 'object' ? x.value : x) === v);
      return o ? (typeof o === 'object' ? o.label : o) : v;
    }
    return `${f.label} ✓`;
  };

  const openCreate = () => router.push(formHref(config.key, { ...fixed, fixed: Object.keys(fixed).join(',') || undefined }));
  const openRow = (r) => router.push(detailHref(config.key, r._id));

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <FlatList
        data={rows}
        keyExtractor={(r) => r._id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={res.isRefetching && !res.isFetchingNextPage} onRefresh={() => res.refetch()} tintColor={C.brand} colors={[C.brand]} />}
        onEndReachedThreshold={0.4}
        onEndReached={() => res.hasNextPage && !res.isFetchingNextPage && res.fetchNextPage()}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={{ marginBottom: 12 }}>
            {header}
            <SearchBar value={q} onChangeText={setQ} placeholder={config.searchPlaceholder || `Search ${config.title.toLowerCase()}…`} />
            {(visibleFilters.length > 0 || extraFilterKeys.length > 0) && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }} contentContainerStyle={{ gap: 8 }}>
                {visibleFilters.map((f) => <Chip key={f.name} label={filterLabel(f)} active={!!filters[f.name]} onPress={() => setEditingFilter(f)} />)}
                {extraFilterKeys.map((k) => <Chip key={k} label={`${k} ✓`} active onPress={() => setFilters((s) => ({ ...s, [k]: undefined }))} />)}
                {Object.values(filters).some(Boolean) && <Chip label="✕ Clear" onPress={() => setFilters({})} />}
              </ScrollView>
            )}
            {total != null ? <Text style={{ fontSize: 12, color: C.muted, marginTop: 10 }}>{total} {total === 1 ? 'record' : 'records'}</Text> : null}
          </View>
        }
        renderItem={({ item }) => {
          const acts = rowActions(item);
          return (
            <RecordCard
              config={config}
              row={item}
              onPress={() => openRow(item)}
              onLongPress={acts.length ? () => setActionsFor(item) : undefined}
              onMore={acts.length ? () => setActionsFor(item) : undefined}
            />
          );
        }}
        ListEmptyComponent={
          res.isLoading ? <ActivityIndicator color={C.brand} style={{ marginTop: 40 }} size="large" />
            : res.error ? <ErrorView error={res.error} onRetry={res.refetch} />
              : <Empty icon={config.icon} title={`No ${config.title.toLowerCase()} found`} description={dq || Object.values(filters).some(Boolean) ? 'Try changing the search or filters.' : config.emptyText} />
        }
        ListFooterComponent={res.isFetchingNextPage ? <ActivityIndicator color={C.brand} style={{ marginVertical: 16 }} /> : null}
      />

      {canCreate && (
        <Pressable onPress={openCreate} style={({ pressed }) => [st.fab, pressed && { opacity: 0.85 }]}>
          <Ionicons name="add" size={22} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>{config.createLabel || `New ${config.singular}`}</Text>
        </Pressable>
      )}

      <ActionSheet visible={!!actionsFor} onClose={() => setActionsFor(null)} title={actionsFor ? config.card(actionsFor).title : ''} actions={actionsFor ? rowActions(actionsFor) : []} />

      {editingFilter && <FilterPicker filter={editingFilter} value={filters[editingFilter.name] || ''} onClose={() => setEditingFilter(null)} onChange={(v) => { setFilters((s) => ({ ...s, [editingFilter.name]: v || undefined })); setEditingFilter(null); }} />}
    </View>
  );
}

/** Bottom-sheet picker for one list filter (options or a server-backed reference) */
function FilterPicker({ filter, value, onChange, onClose }) {
  const kind = filter.ref ? 'ref' : 'select';
  const [qq, setQq] = useState('');
  const dqq = useDebounce(qq, 250);
  const ref = filter.ref;
  const { data, isFetching } = useQuery({
    queryKey: [ref?.endpoint, { ...ref?.params, q: ref?.lookup ? undefined : dqq, limit: 30, _flt: 1 }],
    queryFn: () => get(ref.endpoint, { ...(typeof ref.params === 'object' ? ref.params : {}), q: ref.lookup ? undefined : dqq || undefined, limit: ref.lookup ? 500 : 30 }),
    enabled: kind === 'ref',
  });
  const labelOf = ref?.label || ((o) => o.name || o.title || o.code);
  const options = kind === 'ref'
    ? [{ value: '', label: `All ${filter.label.toLowerCase()}` }, ...(data?.items || []).map((o) => ({ value: o._id, label: labelOf(o), sub: ref.sub?.(o) }))]
    : [{ value: '', label: `All ${filter.label.toLowerCase()}` }, ...filter.options.map((o) => (typeof o === 'object' ? o : { value: o, label: o }))];
  return (
    <Sheet visible onClose={onClose} title={filter.label} full={kind === 'ref'}>
      {kind === 'ref' && <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}><SearchBar value={qq} onChangeText={setQq} placeholder="Type to search…" /></View>}
      {kind === 'ref' && isFetching && !data ? <ActivityIndicator color={C.brand} style={{ marginTop: 20 }} /> : (
        <FlatList
          data={options}
          keyExtractor={(o) => String(o.value)}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable onPress={() => onChange(item.value)} style={[st.opt, item.value === value && { backgroundColor: C.brandLight }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, color: C.text }} numberOfLines={1}>{item.label}</Text>
                {item.sub ? <Text style={{ fontSize: 12, color: C.text2 }} numberOfLines={1}>{item.sub}</Text> : null}
              </View>
              {item.value === value && <Ionicons name="checkmark" size={18} color={C.brand} />}
            </Pressable>
          )}
        />
      )}
    </Sheet>
  );
}

const st = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  img: { width: 64, height: 64, borderRadius: 10, backgroundColor: C.divider },
  title: { flex: 1, fontSize: 15, fontWeight: '600', color: C.text },
  amount: { fontSize: 14, fontWeight: '700', color: C.text },
  sub: { fontSize: 12, color: C.text2, marginTop: 2 },
  meta: { fontSize: 12, color: C.muted, marginTop: 4, lineHeight: 17 },
  fab: { position: 'absolute', right: 16, bottom: 24, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.brand, paddingHorizontal: 18, height: 50, borderRadius: 25, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.divider },
});
