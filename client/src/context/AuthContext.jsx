import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/auth.api';
import { userApi } from '../api/user.api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const current = await authApi.me();
      let profile = null;
      try { profile = await userApi.myProfile(); } catch { /* Hồ sơ có thể chưa được tạo. */ }
      const merged = { ...current, profile };
      setUser(merged);
      return merged;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (payload) => {
    const result = await authApi.login(payload);
    let profile = null;
    try { profile = await userApi.myProfile(); } catch { /* Hồ sơ có thể chưa được tạo. */ }
    const merged = { ...result.user, profile };
    setUser(merged);
    return merged;
  }, []);

  const register = useCallback(async (payload) => {
    const result = await authApi.register(payload);
    let profile = null;
    try { profile = await userApi.myProfile(); } catch { /* Hồ sơ có thể chưa được tạo. */ }
    const merged = { ...result.user, profile };
    setUser(merged);
    return merged;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, setUser, loading, isAuthenticated: Boolean(user), login, register, logout, refreshUser }),
    [user, loading, login, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
