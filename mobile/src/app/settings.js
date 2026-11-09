import { useEffect, useState } from 'react';
import { useApi } from '../lib/hooks';
import { errMsg, put } from '../lib/api';
import { Button, Card, Field, Input, Loader, Screen, toast } from '../components/ui';

const FIELDS = [
  ['companyName', 'Company name'], ['tagline', 'Tagline'], ['phone', 'Phone'], ['email', 'Email'], ['gstin', 'GSTIN'],
  ['bankDetails', 'Bank details', true], ['address', 'Address', true],
];

/** Company details used on quotations, invoices and POs (admins only) */
export default function CompanySettings() {
  const { data, isLoading, refetch } = useApi('/settings');
  const [co, setCo] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data) setCo(data); }, [data]);
  if (isLoading || !co) return <Loader />;

  const save = async () => {
    setBusy(true);
    try {
      await put('/settings', co);
      toast.success('Company details saved');
      refetch();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen footer={<Button title="Save" onPress={save} loading={busy} style={{ flex: 1 }} />}>
      <Card>
        {FIELDS.map(([k, label, multi]) => (
          <Field key={k} label={label}><Input value={co[k] ?? ''} multiline={!!multi} onChangeText={(v) => setCo({ ...co, [k]: v })} /></Field>
        ))}
      </Card>
    </Screen>
  );
}
