import { useEffect, useState } from 'react';
import { Linking, ScrollView, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, C, ListRow, Sheet, confirm } from './ui';
import { FormFields, useForm } from './Form';
import { useAuth } from '../lib/auth';
import { useAction } from '../lib/hooks';
import { toHref } from '../lib/nav';

/* ---------------- prompt: a small form in a bottom sheet, resolves with the values or null ---------------- */
let openPrompt = () => Promise.resolve(null);
export const prompt = (def) => openPrompt(def);

function PromptForm({ def, onDone }) {
  const form = useForm(def.fields, null, def.initial || {});
  return (
    <>
      <ScrollView style={{ paddingHorizontal: 16 }} keyboardShouldPersistTaps="handled">
        {def.description ? <Text style={{ color: C.text2, marginBottom: 12 }}>{def.description}</Text> : null}
        <FormFields form={form} />
      </ScrollView>
      <Sheet.Footer>
        <Button title="Cancel" variant="secondary" onPress={() => onDone(null)} style={{ flex: 1 }} />
        <Button title={def.submitText || 'Save'} onPress={() => form.validate() && onDone(form.payload())} style={{ flex: 1 }} />
      </Sheet.Footer>
    </>
  );
}

export function PromptHost() {
  const [req, setReq] = useState(null);
  useEffect(() => {
    openPrompt = (def) => new Promise((resolve) => setReq({ def, resolve, id: Date.now() }));
  }, []);
  const done = (v) => {
    req?.resolve(v);
    setReq(null);
  };
  return (
    <Sheet visible={!!req} onClose={() => done(null)} title={req?.def.title}>
      {req && <PromptForm key={req.id} def={req.def} onDone={done} />}
    </Sheet>
  );
}

/* ---------------- action sheet ---------------- */
export function ActionSheet({ visible, onClose, title, actions }) {
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <ScrollView>
        {actions.map((a, i) => (
          <ListRow key={i} icon={a.icon || 'ellipse-outline'} label={a.label} danger={a.danger} right={null}
            onPress={() => { onClose(); setTimeout(() => a.onClick(), 250); }} />
        ))}
      </ScrollView>
    </Sheet>
  );
}

/**
 * The ctx object the resource configs receive — same shape as the web app's
 * (nav takes web paths like "/finance/bills/<id>").
 */
export function useCtx(extra = {}) {
  const router = useRouter();
  const auth = useAuth();
  const action = useAction();
  return {
    nav: (webPath, replace) => (replace ? router.replace(toHref(webPath)) : router.push(toHref(webPath))),
    action,
    can: auth.can,
    role: auth.role,
    isAdmin: auth.isAdmin,
    isExternal: auth.isExternal,
    prompt,
    confirm,
    call: (phone) => Linking.openURL(`tel:${String(phone).replace(/\s+/g, '')}`),
    ...extra,
  };
}
