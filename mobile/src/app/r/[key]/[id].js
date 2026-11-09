import { Image, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { RESOURCES } from '../../../config/resources';
import { useRowActions } from '../../../components/ResourceList';
import { useCtx } from '../../../components/Prompt';
import { SummaryBox, Thumb } from '../../../components/Form';
import { Badge, Button, C, Card, Empty, ErrorView, KeyValue, ListRow, Loader, Progress, Screen, SectionTitle, StatusBadge, confirm, toast } from '../../../components/ui';
import { useCtxExtra } from '../../../components/resourceHelpers';
import ProjectExtra from '../../../components/ProjectExtra';
import { del, errMsg, fileUrl } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { useApi } from '../../../lib/hooks';
import { fmtDate, getPath, isImage, money, monthLabel, number, refName } from '../../../lib/format';
import { formHref, toHref } from '../../../lib/nav';
import { TONES } from '../../../lib/theme';

const TOTALS = [
  ['materialTotal', 'Material'], ['labourTotal', 'Labour'], ['costTotal', 'Total cost'], ['profitAmount', 'Profit'],
  ['subtotal', 'Subtotal'], ['discountAmount', 'Discount'], ['taxable', 'Taxable'], ['gstAmount', 'GST'],
  ['retentionAmount', 'Retention'], ['grandTotal', 'Grand total', true], ['total', 'Total', true],
  ['paidAmount', 'Paid'], ['balance', 'Balance', true],
  ['gross', 'Gross'], ['deductions', 'Deductions'], ['net', 'Net pay', true],
];

function displayValue(f, record) {
  const v = getPath(record, f.name);
  if (v == null || v === '' || (Array.isArray(v) && !v.length)) {
    if (f.type === 'ref' && v === null && f.ref?.nullLabel) return f.ref.nullLabel;
    return null;
  }
  const lbl = (o) => {
    if (!o || typeof o !== 'object') return String(o);
    try { return f.ref?.label?.(o) || refName(o); } catch { return refName(o); }
  };
  switch (f.type) {
    case 'ref': return lbl(v);
    case 'multiref': return v.map(lbl).join(', ');
    case 'date': return fmtDate(v);
    case 'month': return monthLabel(v);
    case 'currency': return money(v);
    case 'percent': return `${number(v)}%`;
    case 'number': return number(v);
    case 'checkbox': return v ? (f.checkboxLabel ? `Yes — ${f.checkboxLabel}` : 'Yes') : 'No';
    case 'select': {
      const o = (f.options || []).find((x) => typeof x === 'object' && x.value === v);
      return o ? o.label : String(v);
    }
    default: return typeof v === 'object' ? refName(v) : String(v);
  }
}

export default function ResourceDetail() {
  const { key, id } = useLocalSearchParams();
  const config = RESOURCES[key];
  const { data: r, isLoading, error, refetch, isRefetching } = useApi(config ? `${config.endpoint}/${id}` : null);
  if (!config) return <Empty title="Unknown module" />;
  if (isLoading) return <Loader />;
  if (error) return <ErrorView error={error} onRetry={refetch} />;
  return <DetailBody config={config} r={r} refetch={refetch} refreshing={isRefetching} />;
}

function DetailBody({ config, r, refetch, refreshing }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { can } = useAuth();
  const ctx = useCtx(useCtxExtra(config.key));
  const rowActions = useRowActions(config, ctx);
  const c = config.card(r);
  const canEdit = can(config.module, 'edit') && config.editable !== false && config.canEditRow?.(r) !== false;
  const canDelete = canEdit && config.deletable !== false;

  const detailActions = (config.detailActions?.(r, ctx) || []).filter(Boolean);
  const primary = detailActions.filter((a) => a.primary);
  const others = [...detailActions.filter((a) => !a.primary), ...rowActions(r, { includeEdit: false })];
  const related = (config.related?.(r, ctx) || []).filter((x) => x && (!x.module || can(x.module, 'menu')));

  const photos = config.fields
    .filter((f) => f.type === 'files' || f.type === 'file')
    .flatMap((f) => [].concat(getPath(r, f.name) || []))
    .filter(Boolean);
  const plain = config.fields.filter((f) => !f.hidden && !['items', 'files', 'file', 'password'].includes(f.type));
  const itemFields = config.fields.filter((f) => f.type === 'items' && r[f.name]?.length);
  const totals = TOTALS.filter(([k]) => typeof r[k] === 'number').map(([k, label, strong]) => ({ label, value: money(r[k], true), strong }));

  const remove = async () => {
    if (!(await confirm({ title: `Delete ${config.singular || 'record'}?`, message: `${r.code || r.name || r.title || 'This record'} will be permanently deleted.`, confirmText: 'Delete' }))) return;
    try {
      await del(`${config.endpoint}/${r._id}`);
      toast.success('Deleted');
      qc.invalidateQueries();
      router.back();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: r.code || config.singular }} />
      <Screen onRefresh={refetch} refreshing={refreshing}>
        <Card>
          <Text style={{ fontSize: 19, fontWeight: '700', color: C.text }}>{c.title || '—'}</Text>
          {c.sub ? <Text style={{ fontSize: 13, color: C.text2, marginTop: 3 }}>{c.sub}</Text> : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
            {c.badge ? <Badge tone={c.badge.tone}>{c.badge.text}</Badge> : <StatusBadge value={c.status} />}
            <View style={{ flex: 1 }} />
            {c.amount ? <Text style={{ fontSize: 18, fontWeight: '800', color: c.amountTone ? TONES[c.amountTone]?.fg : C.text }}>{c.amount}</Text> : null}
          </View>
          {c.progress != null ? <Progress value={c.progress} style={{ marginTop: 10 }} /> : null}
        </Card>

        {primary.length > 0 && (
          <View style={{ gap: 8, marginTop: 12 }}>
            {primary.map((a) => <Button key={a.label} title={a.label} icon={a.icon} onPress={a.onClick} loading={ctx.action.isPending} />)}
          </View>
        )}

        {config.key === 'projects' && <ProjectExtra project={r} />}

        {photos.length > 0 && (
          <>
            <SectionTitle>Photos & files</SectionTitle>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {photos.map((u) => (
                <Pressable key={u} onPress={() => Linking.openURL(fileUrl(u))}>
                  {isImage(u) ? <Image source={{ uri: fileUrl(u) }} style={{ width: 150, height: 150, borderRadius: 12, backgroundColor: C.divider }} /> : <Thumb url={u} size={150} />}
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}

        {others.length > 0 && (
          <>
            <SectionTitle>Actions</SectionTitle>
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              {others.map((a) => <ListRow key={a.label} icon={a.icon} label={a.label} danger={a.danger} onPress={a.onClick} right={null} />)}
            </Card>
          </>
        )}

        <SectionTitle>Details</SectionTitle>
        <Card style={{ paddingVertical: 4 }}>
          {plain.filter((f) => !f.showIf || f.showIf(r)).map((f) => {
            const v = displayValue(f, r);
            return v == null ? null : <KeyValue key={f.name} label={f.label} value={v} />;
          })}
          {r.createdAt ? <KeyValue label="Created" value={`${fmtDate(r.createdAt, 'dd MMM yyyy, hh:mm a')}${r.createdBy?.name ? ` · ${r.createdBy.name}` : ''}`} /> : null}
        </Card>

        {itemFields.map((f) => (
          <View key={f.name}>
            <SectionTitle>{f.label}</SectionTitle>
            {r[f.name].map((row, i) => {
              const cols = f.columns.filter((col) => !col.computed);
              const first = cols[0];
              const rest = cols.slice(1);
              const amountCol = f.columns.find((col) => col.computed);
              return (
                <Card key={row._id || i} style={{ marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Text style={{ flex: 1, fontWeight: '600', color: C.text }}>{i + 1}. {displayValue(first, row) || '—'}</Text>
                    {amountCol ? <Text style={{ fontWeight: '700', color: C.text }}>{money(amountCol.computed(row))}</Text> : null}
                  </View>
                  <Text style={{ fontSize: 12, color: C.text2, marginTop: 4 }}>
                    {rest.map((col) => { const v = displayValue(col, row); return v ? `${col.label}: ${v}` : null; }).filter(Boolean).join('  ·  ')}
                    {row.receivedQty != null ? `  ·  Received: ${number(row.receivedQty)}` : ''}
                  </Text>
                </Card>
              );
            })}
          </View>
        ))}

        {totals.length > 0 && <View style={{ marginTop: 12 }}><SummaryBox items={totals} /></View>}

        {config.key === 'payroll' && r.lines?.length > 0 && (
          <>
            <SectionTitle>Employees ({r.lines.length})</SectionTitle>
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              {r.lines.map((l) => (
                <ListRow key={l._id} icon="person-outline" label={l.name || l.employee?.name || 'Employee'}
                  sub={`${number(l.payableDays)} paid days${l.lopDays ? ` · LOP ${number(l.lopDays)}` : ''} · gross ${money(l.gross)} · ded. ${money(l.deductions)}`}
                  right={<Text style={{ fontWeight: '700', color: C.text }}>{money(l.net)}</Text>}
                  onPress={r.status !== 'Draft' ? () => router.push(`/payslip/${r._id}/${l.employee?._id || l.employee}`) : undefined} />
              ))}
            </Card>
          </>
        )}

        {config.key === 'rooms' && r.revisions?.length > 0 && (
          <>
            <SectionTitle>Client feedback</SectionTitle>
            <Card>
              {r.revisions.map((x, i) => <KeyValue key={i} label={`v${x.version || i + 1} · ${fmtDate(x.date)} · ${x.requestedBy || 'Client'}`} value={x.notes} />)}
            </Card>
          </>
        )}

        {related.length > 0 && (
          <>
            <SectionTitle>Related</SectionTitle>
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              {related.map((x) => <ListRow key={x.label} icon="link-outline" label={x.label} onPress={() => router.push(toHref(x.path))} />)}
            </Card>
          </>
        )}

        {(canEdit || canDelete) && (
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
            {canEdit && <Button title="Edit" icon="create-outline" variant="secondary" onPress={() => router.push(formHref(config.key, { id: r._id }))} style={{ flex: 1 }} />}
            {canDelete && <Button title="Delete" icon="trash-outline" variant="danger" onPress={remove} style={{ flex: 1 }} />}
          </View>
        )}
      </Screen>
    </>
  );
}
