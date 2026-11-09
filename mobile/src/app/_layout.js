import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Image, View } from 'react-native';
import { AuthProvider, useAuth } from '../lib/auth';
import { C, ToastProvider } from '../components/ui';
import { PromptHost } from '../components/Prompt';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 15_000, retry: (n, e) => n < 1 && (!e?.response || e.response.status >= 500) },
  },
});

function Splash() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
      <Image source={require('../../assets/logo.png')} style={{ width: 140, height: 140 }} resizeMode="contain" />
    </View>
  );
}

function RootNavigator() {
  const { user, loading } = useAuth();
  if (loading) return <Splash />;
  return (
    <Stack
      screenOptions={{
        headerTintColor: C.brandDark,
        headerTitleStyle: { color: C.text, fontWeight: '700' },
        headerStyle: { backgroundColor: '#fff' },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: C.bg },
      }}
    >
      <Stack.Protected guard={!user}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="r/[key]/index" options={{ title: '' }} />
        <Stack.Screen name="r/[key]/[id]" options={{ title: '' }} />
        <Stack.Screen name="r/[key]/form" options={{ title: '', presentation: 'modal' }} />
        <Stack.Screen name="attendance" options={{ title: 'Mark Attendance' }} />
        <Stack.Screen name="staff-attendance" options={{ title: 'Staff Attendance' }} />
        <Stack.Screen name="stock" options={{ title: 'Stock' }} />
        <Stack.Screen name="my-hr" options={{ title: 'My HR' }} />
        <Stack.Screen name="payslip/[payroll]/[employee]" options={{ title: 'Payslip' }} />
        <Stack.Screen name="reports" options={{ title: 'Reports' }} />
        <Stack.Screen name="workflow" options={{ title: 'Business Flow' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthProvider>
            <StatusBar style="dark" />
            <RootNavigator />
            <PromptHost />
          </AuthProvider>
        </ToastProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
