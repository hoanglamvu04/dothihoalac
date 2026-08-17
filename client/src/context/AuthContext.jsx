import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/auth.api';
import { userApi } from '../api/user.api';

const AuthContext = createContext(null);
const USER_SYNC_STORAGE_KEY = 'dthl:user-updated';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const current = await authApi.me();
      let profile = current?.profile || null;

      // /auth/me có thể chỉ chứa ObjectId của media. Luôn thử lấy profile
      // riêng để avatar/cover/area được populate đầy đủ cho header toàn site.
      try {
        const hydratedProfile = await userApi.myProfile();
        if (hydratedProfile) profile = hydratedProfile;
      } catch {
        /* Giữ profile từ /auth/me nếu endpoint hồ sơ tạm thời không khả dụng. */
      }

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

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        refreshUser();
      }
    };

    const refreshOnStorage = (event) => {
      if (event.key === USER_SYNC_STORAGE_KEY) {
        refreshUser();
      }
    };

    window.addEventListener('focus', refreshWhenVisible);
    window.addEventListener('pageshow', refreshWhenVisible);
    window.addEventListener('storage', refreshOnStorage);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      window.removeEventListener('focus', refreshWhenVisible);
      window.removeEventListener('pageshow', refreshWhenVisible);
      window.removeEventListener('storage', refreshOnStorage);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
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
