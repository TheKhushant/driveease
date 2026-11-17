import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { get, post, tokenStore } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [checking, setChecking] = useState(Boolean(tokenStore.get()));

  useEffect(() => {
    if (!tokenStore.get()) return;
    get('/auth/me')
      .then(setAdmin)
      .catch(() => tokenStore.clear())
      .finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    const onUnauthorized = () => setAdmin(null);
    window.addEventListener('driveease:unauthorized', onUnauthorized);
    return () => window.removeEventListener('driveease:unauthorized', onUnauthorized);
  }, []);

  const login = useCallback(async (email, password) => {
    const { token, admin: a } = await post('/auth/login', { email, password });
    tokenStore.set(token);
    setAdmin(a);
    return a;
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setAdmin(null);
  }, []);

  const value = useMemo(
    () => ({
      admin,
      setAdmin,
      checking,
      login,
      logout,
      isAdmin: admin && ['superadmin', 'admin'].includes(admin.role),
    }),
    [admin, checking, login, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
