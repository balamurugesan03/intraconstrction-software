import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { del, errMsg, get, post, put } from './api';
import { toast } from '../components/ui';

/** Fetch any GET endpoint with React Query */
export const useApi = (url, params, options = {}) =>
  useQuery({ queryKey: [url, params], queryFn: () => get(url, params), enabled: !!url, ...options });

/**
 * POST / PUT / DELETE an action endpoint, toast the result and refresh everything.
 * Same call shape as the web app: action.mutate({ url, body, method, success }, { onSuccess })
 */
export function useAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ url, body, method }) => (method === 'put' ? put(url, body) : method === 'delete' ? del(url) : post(url, body)),
    onSuccess: (_d, v) => {
      if (v.success !== false) toast.success(v.success || 'Done');
      qc.invalidateQueries();
    },
    onError: (e) => toast.error(errMsg(e)),
  });
}

export function useDebounce(value, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}
