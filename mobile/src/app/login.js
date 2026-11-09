import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../lib/auth';
import { errMsg } from '../lib/api';
import { Button, C, Field, Input } from '../components/ui';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!email.trim() || !password) return setError('Enter your email and password');
    setBusy(true);
    setError('');
    try {
      await login(email, password);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: 'center', marginBottom: 28 }}>
            <Image source={require('../../assets/logo.png')} style={{ width: 120, height: 120 }} resizeMode="contain" />
            <Text style={{ fontSize: 24, fontWeight: '800', color: C.text, marginTop: 8 }}>Intra Interiors</Text>
            <Text style={{ fontSize: 14, color: C.text2, marginTop: 4 }}>Construction & Interior ERP</Text>
          </View>

          <Field label="Email">
            <Input value={email} onChangeText={setEmail} placeholder="you@company.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="username" returnKeyType="next" />
          </Field>
          <Field label="Password">
            <View style={{ justifyContent: 'center' }}>
              <Input value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry={!show} autoCapitalize="none" autoComplete="password" textContentType="password" returnKeyType="go" onSubmitEditing={submit} style={{ paddingRight: 44 }} />
              <Pressable onPress={() => setShow((v) => !v)} hitSlop={10} style={{ position: 'absolute', right: 12 }}>
                <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.muted} />
              </Pressable>
            </View>
          </Field>
          {error ? <Text style={{ color: C.danger, marginBottom: 12 }}>{error}</Text> : null}
          <Button title="Sign in" onPress={submit} loading={busy} />
          <Text style={{ textAlign: 'center', color: C.muted, fontSize: 12, marginTop: 24 }}>Use the same login as www.intrainteriors.co/cms</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
