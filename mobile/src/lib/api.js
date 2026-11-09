import axios from 'axios';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/** API base, e.g. https://www.intrainteriors.co/cms/api (set in app.json → expo.extra.apiUrl) */
export const API_URL = (Constants.expoConfig?.extra?.apiUrl || 'https://www.intrainteriors.co/cms/api').replace(/\/+$/, '');
/** Origin of the server, used to turn "/cms/uploads/x.jpg" into a full URL */
export const ORIGIN = API_URL.replace(/^(https?:\/\/[^/]+).*$/, '$1');
export const fileUrl = (u) => (!u ? '' : /^https?:\/\//.test(u) ? u : `${ORIGIN}${u.startsWith('/') ? '' : '/'}${u}`);

/* ---- token storage (SecureStore on device, localStorage on web preview) ---- */
const KEY = 'token';
let memToken = null;
export const tokenStore = {
  async get() {
    if (memToken) return memToken;
    memToken = Platform.OS === 'web' ? globalThis.localStorage?.getItem(KEY) : await SecureStore.getItemAsync(KEY);
    return memToken;
  },
  async set(t) {
    memToken = t;
    if (Platform.OS === 'web') globalThis.localStorage?.setItem(KEY, t);
    else await SecureStore.setItemAsync(KEY, t);
  },
  async clear() {
    memToken = null;
    if (Platform.OS === 'web') globalThis.localStorage?.removeItem(KEY);
    else await SecureStore.deleteItemAsync(KEY);
  },
};

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

export const api = axios.create({ baseURL: API_URL, timeout: 30000 });

api.interceptors.request.use(async (config) => {
  const token = await tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401 && !err.config?.url?.includes('/auth/login')) {
      await tokenStore.clear();
      onUnauthorized();
    }
    return Promise.reject(err);
  },
);

export const errMsg = (e) => e?.response?.data?.message || (e?.message === 'Network Error' ? 'Cannot reach the server. Check your internet connection.' : e?.message) || 'Something went wrong';

const clean = (params) => (params ? Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== '')) : undefined);
export const get = (url, params) => api.get(url, { params: clean(params) }).then((r) => r.data);
export const post = (url, body) => api.post(url, body ?? {}).then((r) => r.data);
export const put = (url, body) => api.put(url, body ?? {}).then((r) => r.data);
export const del = (url) => api.delete(url).then((r) => r.data);

/** files: [{ uri, name, mimeType }] from the image / document picker */
export async function uploadFiles(files) {
  const fd = new FormData();
  for (const f of files) {
    if (Platform.OS === 'web' && f.file) fd.append('files', f.file);
    else fd.append('files', { uri: f.uri, name: f.name || f.uri.split('/').pop() || 'upload', type: f.mimeType || 'application/octet-stream' });
  }
  const { data } = await api.post('/uploads', fd, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 });
  return data.files;
}
