import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/auth';
import { useApi } from '../../lib/hooks';
import { money, moneyShort, fmtDate, overdue } from '../../lib/format';
import { toHref } from '../../lib/nav';
import { MENU } from '../../config/menu';
import { C, Card, Empty, ErrorView, Grid, ListRow, Loader, Progress, Screen, SectionTitle, StatCard, StatusBadge } from '../../components/ui';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

/** One-tap shortcuts for the most common field actions the role is allowed to do */
function QuickActions() {
  const { can } = useAuth();
  const router = useRouter();
  const items = [
    can('attendance', 'edit') && { label: 'Attendance', icon: 'calendar', to: '/workforce/attendance' },
    can('dailyReports', 'edit') && { label: 'Site report', icon: 'clipboard', to: '/site-reports?create=1' },
    can('materialRequests', 'edit') && { label: 'Material req.', icon: 'add-circle', to: '/inventory/requests?create=1' },
    can('expenses', 'edit') && { label: 'Expense', icon: 'cash', to: '/finance/expenses?create=1' },
    can('documents', 'edit') && { label: 'Photo', icon: 'camera', to: '/documents?create=1' },
    can('leads', 'edit') && { label: 'New lead', icon: 'locate', to: '/leads?create=1' },
    can('payments', 'edit') && { label: 'Payment', icon: 'wallet', to: '/finance/payments?create=1' },
    can('tickets', 'edit') && { label: 'Ticket', icon: 'help-buoy', to: '/crm/tickets?create=1' },
    can('leaves', 'edit') && { label: 'Apply leave', icon: 'calendar-clear', to: '/hr/leaves?create=1' },
  ].filter(Boolean).slice(0, 8);
  if (!items.length) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4, marginTop: 4 }}>
      {items.map((i) => (
        <Pressable key={i.label} onPress={() => router.push(toHref(i.to))} style={({ pressed }) => [{ width: '25%', padding: 4 }, pressed && { opacity: 0.7 }]}>
          <View style={{ backgroundColor: '#fff', borderRadius: 14, paddingVertical: 12, alignItems: 'center', borderWidth: 0.5, borderColor: C.border }}>
            <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: C.brandLight, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={`${i.icon}-outline`} size={20} color={C.brandDark} />
            </View>
            <Text style={{ fontSize: 11, color: C.text, marginTop: 6, fontWeight: '500' }} numberOfLines={1}>{i.label}</Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

function TaskList({ tasks, isOverdue }) {
  const router = useRouter();
  if (!tasks?.length) return <Card><Text style={{ color: C.muted, textAlign: 'center' }}>{isOverdue ? 'No overdue tasks 🎉' : 'Nothing due this week'}</Text></Card>;
  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      {tasks.map((t) => (
        <ListRow key={t._id} icon={isOverdue ? 'alert-circle-outline' : 'time-outline'} tone={isOverdue ? 'red' : 'blue'}
          label={t.title} sub={`${t.project?.code || ''} · ${t.area || 'General'} · ${t.assignedTo?.name || 'Unassigned'} · ${fmtDate(t.dueDate, 'dd MMM')}`}
          onPress={() => router.push(`/r/tasks/${t._id}`)} />
      ))}
    </Card>
  );
}

export default function Home() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, isExternal, can } = useAuth();
  const { data, isLoading, error, refetch, isRefetching } = useApi(can('dashboard', 'menu') ? '/dashboard' : null);
  const go = (p) => router.push(toHref(p));
  const k = data?.kpis || {};
  const fin = !!data?.finance;
  const showProjects = can('projects', 'menu');

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 18, backgroundColor: C.dark }}>
        <Text style={{ color: C.gold, fontSize: 13, fontWeight: '600' }}>Intra Interiors</Text>
        <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 2 }}>{greeting()}, {user.name.split(' ')[0]} 👋</Text>
        <Text style={{ color: '#cbd5e1', fontSize: 13, marginTop: 2 }}>{isExternal ? 'Here is the latest on your projects.' : `${user.role}${user.designation ? ` · ${user.designation}` : ''}`}</Text>
      </View>
      <Screen onRefresh={refetch} refreshing={isRefetching}>
        <QuickActions />

        {!can('dashboard', 'menu') ? null : isLoading ? <Loader /> : error ? <ErrorView error={error} onRetry={refetch} /> : (
          <>
            {showProjects && (
              <>
                <SectionTitle>Projects</SectionTitle>
                <Grid>
                  <StatCard label="Total projects" value={k.totalProjects} icon="folder-open-outline" tone="slate" onPress={() => go('/projects')} />
                  <StatCard label="Ongoing" value={k.Ongoing} icon="pulse-outline" tone="blue" onPress={() => go('/projects?status=Ongoing')} />
                  <StatCard label="Completed" value={k.Completed} icon="checkmark-circle-outline" tone="green" onPress={() => go('/projects?status=Completed')} />
                  <StatCard label="On hold" value={k['On Hold']} icon="pause-circle-outline" tone="amber" onPress={() => go('/projects?status=On Hold')} />
                  <StatCard label="Avg. progress" value={`${k.avgProgress ?? 0}%`} icon="trending-up-outline" tone="violet" />
                  {k.lowStock !== undefined && can('stock', 'menu')
                    ? <StatCard label="Low-stock items" value={k.lowStock} icon="layers-outline" tone={k.lowStock ? 'red' : 'slate'} onPress={() => go('/inventory/stock')} />
                    : fin ? <StatCard label="Project value" value={moneyShort(k.contractValue)} icon="cash-outline" tone="brand" hint={money(k.contractValue)} /> : null}
                </Grid>
              </>
            )}

            {fin && (
              <>
                <SectionTitle>Money</SectionTitle>
                <Grid>
                  {k.lowStock !== undefined && <StatCard label="Project value" value={moneyShort(k.contractValue)} icon="briefcase-outline" tone="brand" hint={money(k.contractValue)} />}
                  <StatCard label="Received" value={moneyShort(k.received)} icon="wallet-outline" tone="green" hint={`${k.contractValue ? Math.round((k.received / k.contractValue) * 100) : 0}% of value`} />
                  <StatCard label="Pending" value={moneyShort(k.pending)} icon="hourglass-outline" tone="amber" hint={`Billed ${moneyShort(k.billed)}`} />
                  {!isExternal && <StatCard label="Material" value={moneyShort(k.material)} icon="cube-outline" tone="blue" />}
                  {!isExternal && <StatCard label="Labour" value={moneyShort(k.labour)} icon="hammer-outline" tone="cyan" hint={`+ Subcontract ${moneyShort(k.subcontract)}`} />}
                  {!isExternal && <StatCard label="Profit / Loss" value={moneyShort(k.profit)} icon={k.profit >= 0 ? 'trending-up-outline' : 'trending-down-outline'} tone={k.profit >= 0 ? 'green' : 'red'} hint={`Cost ${moneyShort(k.totalCost)}`} />}
                </Grid>
              </>
            )}

            {showProjects && data.sites?.some((p) => ['Ongoing', 'Planning'].includes(p.status)) && (
              <>
                <SectionTitle>Active projects</SectionTitle>
                {data.sites.filter((p) => ['Ongoing', 'Planning'].includes(p.status)).slice(0, 6).map((p) => (
                  <Card key={p._id} onPress={() => router.push(`/r/projects/${p._id}`)} style={{ marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                      <Text style={{ fontWeight: '600', color: C.text, flex: 1 }} numberOfLines={1}>{p.name}</Text>
                      <StatusBadge value={p.status} />
                    </View>
                    <Text style={{ fontSize: 12, color: C.text2, marginTop: 2 }} numberOfLines={1}>{p.code} · {p.client || ''}{p.endDate ? ` · due ${fmtDate(p.endDate, 'dd MMM')}` : ''}{overdue(p.endDate) && p.status !== 'Completed' ? ' ⚠' : ''}</Text>
                    <Progress value={p.progress} style={{ marginTop: 8 }} />
                  </Card>
                ))}
              </>
            )}

            {can('tasks', 'menu') && (
              <>
                <SectionTitle>Overdue tasks</SectionTitle>
                <TaskList tasks={data.overdueTasks} isOverdue />
                <SectionTitle>Due this week</SectionTitle>
                <TaskList tasks={data.upcomingTasks} />
              </>
            )}

            {can('dailyReports', 'menu') && data.recentReports?.length > 0 && (
              <>
                <SectionTitle right={<Text onPress={() => go('/site-reports')} style={{ color: C.brand, fontWeight: '600', fontSize: 13 }}>See all</Text>}>Latest site reports</SectionTitle>
                <Card style={{ padding: 0, overflow: 'hidden' }}>
                  {data.recentReports.map((r) => (
                    <ListRow key={r._id} icon="clipboard-outline" label={r.project?.name || r.code} sub={`${fmtDate(r.date, 'dd MMM')} · ${r.submittedBy?.name || ''} · ${r.workDone || ''}`} onPress={() => router.push(`/r/dailyReports/${r._id}`)} />
                  ))}
                </Card>
              </>
            )}
          </>
        )}

        {!showProjects && <ModuleShortcuts />}
      </Screen>
    </View>
  );
}

/** For roles without projects (e.g. HR, accounts) the home screen lists their modules */
function ModuleShortcuts() {
  const { can } = useAuth();
  const router = useRouter();
  const items = MENU.flatMap((g) => g.items).filter((i) => can(i.module, 'menu'));
  if (!items.length) return <Empty title="No modules assigned" description="Ask your administrator to give your role access." />;
  return (
    <>
      <SectionTitle>Your modules</SectionTitle>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {items.map((i) => <ListRow key={i.to} icon={i.icon} label={i.label} onPress={() => router.push(toHref(i.to))} />)}
      </Card>
    </>
  );
}
