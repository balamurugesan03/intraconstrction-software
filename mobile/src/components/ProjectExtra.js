import { ScrollView, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../lib/auth';
import { useApi, useAction } from '../lib/hooks';
import { moneyShort, number } from '../lib/format';
import { formHref, listHref } from '../lib/nav';
import { PROJECT_STATUS } from '../lib/constants';
import { C, Card, Chip, Grid, ListRow, SectionTitle, StatCard } from './ui';

/** Project hub: summary KPIs, status change and every project-scoped module */
export default function ProjectExtra({ project }) {
  const router = useRouter();
  const { can, isExternal } = useAuth();
  const action = useAction();
  const { data: s } = useApi(`/projects/${project._id}/summary`);
  const id = project._id;
  const scoped = (key, extra = {}) => listHref(key, { project: id, fixed: 'project', title: extra.title });
  const create = (key, extra = {}) => formHref(key, { project: id, fixed: 'project', ...extra });

  const sections = [
    can('tasks', 'menu') && { label: 'Tasks & work plan', icon: 'checkbox-outline', href: scoped('tasks'), sub: s ? `${s.tasks.total} tasks${s.tasks.overdue ? ` · ${s.tasks.overdue} overdue` : ''}` : null },
    can('dailyReports', 'menu') && { label: 'Daily site reports', icon: 'clipboard-outline', href: scoped('dailyReports') },
    can('materialRequests', 'menu') && { label: 'Material requests', icon: 'add-circle-outline', href: scoped('materialRequests') },
    can('stock', 'menu') && { label: 'Site stock', icon: 'layers-outline', href: `/stock?location=${id}`, sub: s ? `${s.stock.length} material(s) at site` : null },
    can('attendance', 'menu') && { label: 'Labour attendance', icon: 'calendar-outline', href: listHref('attendanceRegister', { project: id, fixed: 'project' }), sub: s ? `${number(s.labourDays)} labour-days so far` : null },
    can('workOrders', 'menu') && { label: 'Subcontract work orders', icon: 'document-attach-outline', href: scoped('workOrders'), sub: s?.workOrders?.length ? `${s.workOrders.length} work order(s)` : null },
    can('measurements', 'menu') && { label: 'Measurement book', icon: 'resize-outline', href: scoped('measurements') },
    can('bills', 'menu') && { label: 'Bills & invoices', icon: 'receipt-outline', href: listHref('bills', { project: id }) },
    can('payments', 'menu') && { label: 'Payments', icon: 'wallet-outline', href: listHref('payments', { project: id }) },
    can('expenses', 'menu') && { label: 'Expenses', icon: 'cash-outline', href: scoped('expenses') },
    can('rooms', 'menu') && { label: 'Interior design · rooms', icon: 'bed-outline', href: scoped('rooms') },
    can('documents', 'menu') && { label: 'Documents & photos', icon: 'images-outline', href: scoped('documents') },
    can('tickets', 'menu') && { label: 'Service & complaints', icon: 'help-buoy-outline', href: scoped('tickets') },
  ].filter(Boolean);

  const quick = [
    can('attendance', 'edit') && { label: 'Mark attendance', href: `/attendance?project=${id}` },
    can('dailyReports', 'edit') && { label: '+ Site report', href: create('dailyReports') },
    can('tasks', 'edit') && { label: '+ Task', href: create('tasks') },
    can('materialRequests', 'edit') && { label: '+ Material request', href: create('materialRequests') },
    can('expenses', 'edit') && { label: '+ Expense', href: create('expenses') },
    can('documents', 'edit') && { label: '+ Photo', href: create('documents') },
  ].filter(Boolean);

  const f = s?.finance;
  return (
    <>
      {quick.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 12 }}>
          {quick.map((q) => <Chip key={q.label} label={q.label} onPress={() => router.push(q.href)} />)}
        </ScrollView>
      )}

      {s && (
        <>
          <SectionTitle>Overview</SectionTitle>
          <Grid>
            <StatCard label="Tasks" value={s.tasks.total} hint={`${s.tasks.Done || 0} done · ${s.tasks['In Progress'] || 0} in progress`} icon="checkbox-outline" tone="blue" />
            <StatCard label="Overdue tasks" value={s.tasks.overdue} icon="alert-circle-outline" tone={s.tasks.overdue ? 'red' : 'slate'} />
            {f?.billed != null && <StatCard label="Billed" value={moneyShort(f.billed)} icon="receipt-outline" tone="brand" />}
            {f?.received != null && <StatCard label="Received" value={moneyShort(f.received)} icon="wallet-outline" tone="green" />}
            {!isExternal && f?.material != null && <StatCard label="Material" value={moneyShort(f.material)} icon="cube-outline" tone="blue" />}
            {!isExternal && f?.labour != null && <StatCard label="Labour" value={moneyShort(f.labour)} icon="hammer-outline" tone="cyan" hint={f.subcontract != null ? `+ Subcontract ${moneyShort(f.subcontract)}` : undefined} />}
            {!isExternal && f?.totalCost != null && <StatCard label="Total cost" value={moneyShort(f.totalCost)} icon="calculator-outline" tone="amber" hint={project.budget ? `Budget ${moneyShort(project.budget)}` : undefined} />}
            {!isExternal && f?.billed != null && f?.totalCost != null && <StatCard label="Profit / Loss" value={moneyShort(f.billed - f.totalCost)} icon="trending-up-outline" tone={f.billed - f.totalCost >= 0 ? 'green' : 'red'} />}
          </Grid>
        </>
      )}

      {can('projects', 'edit') && (
        <>
          <SectionTitle>Change status</SectionTitle>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {PROJECT_STATUS.map((st) => (
              <Chip key={st} label={st} active={project.status === st}
                onPress={() => st !== project.status && action.mutate({ url: `/projects/${id}`, method: 'put', body: { status: st }, success: `Project marked ${st}` })} />
            ))}
          </ScrollView>
        </>
      )}

      <SectionTitle>Project modules</SectionTitle>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {sections.map((x) => <ListRow key={x.label} icon={x.icon} label={x.label} sub={x.sub} onPress={() => router.push(x.href)} />)}
        {!sections.length && <Text style={{ padding: 16, color: C.muted }}>No project modules for your role.</Text>}
      </Card>
    </>
  );
}
