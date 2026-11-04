import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

const AuthContext = createContext(null);

// The login token lives in sessionStorage: it is dropped when the browser/tab is closed, so every
// new visit asks for the email & password again. Remove tokens left in localStorage by older builds.
localStorage.removeItem('token');
const EXTERNAL = ['Client', 'Contractor', 'Worker'];

export function AuthProvider({ children }) {
  const qc = useQueryClient();
  const [state, setState] = useState({ user: null, access: {}, loading: !!sessionStorage.getItem('token') });

  const loadMe = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      setState({ user: data.user, access: data.access || {}, loading: false });
    } catch {
      sessionStorage.removeItem('token');
      setState({ user: null, access: {}, loading: false });
    }
  }, []);

  useEffect(() => {
    if (sessionStorage.getItem('token')) loadMe();
    const onLogout = () => {
      setState({ user: null, access: {}, loading: false });
      qc.clear();
    };
    window.addEventListener('auth:logout', onLogout);
    return () => window.removeEventListener('auth:logout', onLogout);
  }, [loadMe, qc]);

  const login = useCallback(
    async (email, password) => {
      const { data } = await api.post('/auth/login', { email, password });
      sessionStorage.setItem('token', data.token);
      await loadMe();
    },
    [loadMe],
  );

  const logout = useCallback(() => {
    sessionStorage.removeItem('token');
    setState({ user: null, access: {}, loading: false });
    qc.clear();
  }, [qc]);

  const value = useMemo(() => {
    const role = state.user?.role;
    const isSuperAdmin = role === 'Super Admin';
    const isAdmin = isSuperAdmin || role === 'Admin';
    // action: 'view' / 'edit' = data access, 'menu' = module shown in sidebar, search and as a page.
    // The server resolves every role (Super Admin included) into the `access` map.
    const can = (module, action = 'view') => {
      if (!role) return false;
      if (!module) return true;
      return !!state.access[module]?.[action];
    };
    return { ...state, role, isSuperAdmin, isAdmin, isExternal: EXTERNAL.includes(role), can, login, logout, reload: loadMe, setUser: (user) => setState((s) => ({ ...s, user })) };
  }, [state, login, logout, loadMe]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
