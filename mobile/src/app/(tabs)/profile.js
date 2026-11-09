import { useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { useAuth } from '../../lib/auth';
import { API_URL, errMsg, put } from '../../lib/api';
import { initials } from '../../lib/format';
import { Button, C, Card, Field, Input, ListRow, Screen, SectionTitle, confirm, toast } from '../../components/ui';

export default function Profile() {
  const { user, setUser, logout, isAdmin, can } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState({ name: user.name || '', phone: user.phone || '', designation: user.designation || '' });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [busy, setBusy] = useState('');

  const run = async (key, fn, msg) => {
    setBusy(key);
    try {
      await fn();
      toast.success(msg);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy('');
    }
  };

  const savePassword = () => {
    if (pw.newPassword.length < 6) return toast.error('New password must be at least 6 characters');
    if (pw.newPassword !== pw.confirm) return toast.error('Passwords do not match');
    run('pw', async () => {
      await put('/auth/password', { currentPassword: pw.currentPassword, newPassword: pw.newPassword });
      setPw({ currentPassword: '', newPassword: '', confirm: '' });
    }, 'Password changed');
  };

  return (
    <Screen>
      <Card style={{ alignItems: 'center', paddingVertical: 22 }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: C.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 26, fontWeight: '800', color: C.brandDark }}>{initials(user.name)}</Text>
        </View>
        <Text style={{ fontSize: 19, fontWeight: '700', color: C.text, marginTop: 10 }}>{user.name}</Text>
        <Text style={{ color: C.text2, marginTop: 2 }}>{user.email}</Text>
        <Text style={{ color: C.brandDark, marginTop: 6, fontWeight: '600' }}>{user.role}</Text>
      </Card>

      <SectionTitle>Shortcuts</SectionTitle>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {can('leaves', 'menu') && <ListRow icon="person-circle-outline" label="My HR · leave & payslips" onPress={() => router.push('/my-hr')} />}
        {isAdmin && <ListRow icon="business-outline" label="Company settings" onPress={() => router.push('/settings')} />}
        <ListRow icon="globe-outline" label="Open web version" sub={API_URL.replace(/\/api$/, '')} onPress={() => Linking.openURL(API_URL.replace(/\/api$/, '/'))} />
      </Card>

      <SectionTitle>My profile</SectionTitle>
      <Card>
        <Field label="Name"><Input value={profile.name} onChangeText={(v) => setProfile({ ...profile, name: v })} /></Field>
        <Field label="Phone"><Input value={profile.phone} keyboardType="phone-pad" onChangeText={(v) => setProfile({ ...profile, phone: v })} /></Field>
        <Field label="Designation"><Input value={profile.designation} onChangeText={(v) => setProfile({ ...profile, designation: v })} /></Field>
        <Button title="Save profile" loading={busy === 'p'} onPress={() => run('p', async () => setUser((await put('/auth/me', profile)).user), 'Profile updated')} />
      </Card>

      <SectionTitle>Change password</SectionTitle>
      <Card>
        <Field label="Current password"><Input secureTextEntry autoCapitalize="none" value={pw.currentPassword} onChangeText={(v) => setPw({ ...pw, currentPassword: v })} /></Field>
        <Field label="New password"><Input secureTextEntry autoCapitalize="none" value={pw.newPassword} onChangeText={(v) => setPw({ ...pw, newPassword: v })} /></Field>
        <Field label="Confirm new password"><Input secureTextEntry autoCapitalize="none" value={pw.confirm} onChangeText={(v) => setPw({ ...pw, confirm: v })} /></Field>
        <Button title="Change password" variant="secondary" loading={busy === 'pw'} onPress={savePassword} />
      </Card>

      <View style={{ height: 20 }} />
      <Button title="Log out" variant="danger" icon="log-out-outline" onPress={async () => { if (await confirm({ title: 'Log out?', confirmText: 'Log out' })) logout(); }} />
      <Text style={{ textAlign: 'center', color: C.muted, fontSize: 12, marginTop: 16 }}>Intra Interiors · v{Constants.expoConfig?.version}</Text>
    </Screen>
  );
}
