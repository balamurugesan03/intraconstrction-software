import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../lib/auth';
import { get } from '../../lib/api';
import { C } from '../../components/ui';

const icon = (name) => ({ color, focused }) => <Ionicons name={focused ? name : `${name}-outline`} size={23} color={color} />;

export default function TabsLayout() {
  const { can } = useAuth();
  const { data } = useQuery({ queryKey: ['/notifications', 'badge'], queryFn: () => get('/notifications'), refetchInterval: 120_000 });
  const high = (data?.items || []).filter((n) => n.severity === 'high').length;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: C.brand,
        tabBarInactiveTintColor: C.muted,
        headerTitleStyle: { fontWeight: '700', color: C.text },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: C.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: icon('home'), headerShown: false }} />
      <Tabs.Screen name="projects" options={{ title: 'Projects', tabBarIcon: icon('folder-open'), href: can('projects', 'menu') ? undefined : null }} />
      <Tabs.Screen name="alerts" options={{ title: 'Alerts', tabBarIcon: icon('notifications'), tabBarBadge: high || undefined }} />
      <Tabs.Screen name="menu" options={{ title: 'Modules', tabBarIcon: icon('grid') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: icon('person-circle') }} />
    </Tabs>
  );
}
