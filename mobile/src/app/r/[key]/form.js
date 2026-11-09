import { useState } from 'react';
import { Text } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { RESOURCES } from '../../../config/resources';
import { FormFields, useForm } from '../../../components/Form';
import { useCtx } from '../../../components/Prompt';
import { Button, C, Empty, ErrorView, Loader, Screen, toast } from '../../../components/ui';
import { splitParams, useFieldsFor } from '../../../components/resourceHelpers';
import { errMsg, post, put } from '../../../lib/api';
import { useApi } from '../../../lib/hooks';

/**
 * Create / edit form for any resource.
 *  /r/<key>/form?id=<id>              edit
 *  /r/<key>/form?field=value…         create, pre-filled (workflow deep links)
 *  /r/<key>/form?project=x&fixed=project   create with a locked field
 */
export default function ResourceFormScreen() {
  const params = useLocalSearchParams();
  const { key, id, initial, fixed } = splitParams(params);
  const config = RESOURCES[key];
  const { data: record, isLoading, error, refetch } = useApi(config && id ? `${config.endpoint}/${id}` : null);

  if (!config) return <Empty title="Unknown module" />;
  if (id && isLoading) return <Loader />;
  if (id && error) return <ErrorView error={error} onRetry={refetch} />;
  return <FormBody key={id || 'new'} config={config} record={id ? record : null} prefill={initial} fixed={fixed} />;
}

function FormBody({ config, record, prefill, fixed }) {
  const router = useRouter();
  const qc = useQueryClient();
  const ctx = useCtx();
  const fields = useFieldsFor(config);
  const isNew = !record;
  // Only keep prefill values for fields that exist on the form
  const pre = Object.fromEntries(Object.entries(prefill).filter(([k]) => fields.some((f) => f.name === k)));
  const hidden = isNew ? fixed : Object.fromEntries(Object.entries(fixed).filter(([k]) => fields.some((f) => f.name === k)));
  const form = useForm(fields, record, { ...(config.defaults?.() || {}), ...pre, ...fixed }, hidden);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.validate()) return;
    setSaving(true);
    try {
      const payload = form.payload();
      const body = config.transform ? config.transform(payload, record) : payload;
      const res = isNew ? await post(config.endpoint, body) : await put(`${config.endpoint}/${record._id}`, body);
      toast.success(isNew ? `${config.singular || 'Record'} created` : 'Changes saved');
      qc.invalidateQueries();
      if (isNew && config.afterCreate) {
        router.back();
        setTimeout(() => config.afterCreate(res, ctx), 50);
      } else {
        router.back();
      }
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: isNew ? config.createLabel || `New ${config.singular}` : `Edit ${record.code || config.singular}` }} />
      <Screen
        footer={<>
          <Button title="Cancel" variant="secondary" onPress={() => router.back()} style={{ flex: 1 }} />
          <Button title={isNew ? 'Create' : 'Save changes'} onPress={submit} loading={saving} style={{ flex: 2 }} />
        </>}
      >
        {config.formDescription ? <Text style={{ color: C.text2, marginBottom: 14 }}>{config.formDescription}</Text> : null}
        <FormFields form={form} record={record} summary={config.summary} hidden={hidden} />
      </Screen>
    </>
  );
}
