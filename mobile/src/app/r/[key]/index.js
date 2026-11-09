import { Stack, useLocalSearchParams } from 'expo-router';
import { RESOURCES } from '../../../config/resources';
import ResourceList from '../../../components/ResourceList';
import { Empty } from '../../../components/ui';
import { MyLeaveBalance, splitParams, useCtxExtra } from '../../../components/resourceHelpers';
import { useAuth } from '../../../lib/auth';

export default function ResourceListScreen() {
  const params = useLocalSearchParams();
  const { key, initial, fixed } = splitParams(params);
  const config = RESOURCES[key];
  const { can } = useAuth();
  const ctxExtra = useCtxExtra(key);

  if (!config) return <Empty title="Unknown module" />;
  if (config.module && !can(config.module)) return <Empty icon="lock-closed-outline" title="No access" description="Your role does not have permission to view this module." />;

  return (
    <>
      <Stack.Screen options={{ title: params.title || config.title }} />
      <ResourceList
        key={JSON.stringify(params)}
        config={config}
        initial={initial}
        fixed={fixed}
        ctxExtra={ctxExtra}
        header={key === 'leaves' ? <MyLeaveBalance /> : null}
      />
    </>
  );
}
