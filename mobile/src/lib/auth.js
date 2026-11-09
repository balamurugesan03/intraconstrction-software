import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, tokenStore, setUnauthorizedHandler } from './api';

const AuthContext = createContext(null);
const EXTERNAL = ['Client', 'Contractor', 'Worker'];

/** Login stays saved on the phone (SecureStore) until the user logs out or the token expires. */
export function AuthProvider({ children }) {
  const qc = useQueryClient();
  const [state, setState] = useState({ user: null, access: {}, loading: true });

  const reset = useCallback(() => {
    setState({ user: null, access: {}, loading: false });
    qc.clear();
  }, [qc]);

  const loadMe = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      setState({ user: data.user, access: data.access || {}, loading: false });
    } catch {
      await tokenStore.clear();
      setState({ user: null, access: {}, loading: false });
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(reset);
    tokenStore.get().then((t) => (t ? loadMe() : setState((s) => ({ ...s, loading: false }))));
  }, [loadMe, reset]);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email: email.trim(), password });
    await tokenStore.set(data.token);
    await loadMe();
  }, [loadMe]);

  const logout = useCallback(async () => {
    await tokenStore.clear();
    reset();
  }, [reset]);

  const value = useMemo(() => {
    const role = state.user?.role;
    const isSuperAdmin = role === 'Super Admin';
    const isAdmin = isSuperAdmin || role === 'Admin';
    // action: 'view' / 'edit' = data access, 'menu' = module shown in the menu
    const can = (module, action = 'view') => {
      if (!role) return false;
      if (!module) return true;
      return !!state.access[module]?.[action];
    };
    return {
      ...state, role, isSuperAdmin, isAdmin, isExternal: EXTERNAL.includes(role), can, login, logout, reload: loadMe,
      setUser: (user) => setState((s) => ({ ...s, user })),
    };
  }, [state, login, logout, loadMe]);

  return createElement(AuthContext.Provider, { value }, children);
}

export const useAuth = () => useContext(AuthContext);
