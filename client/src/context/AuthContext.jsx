import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { authApi } from '../api/auth.api';
import { userApi } from '../api/user.api';

const AuthContext = createContext(null);
const USER_SYNC_STORAGE_KEY = 'dthl:user-updated';
const PASSIVE_REFRESH_TTL_MS = 30_000;

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(null);
  const [loading, setLoading] = useState(true);

  const userRef = useRef(null);
  const refreshPromiseRef = useRef(null);
  const lastRefreshAtRef = useRef(0);

  const setUser = useCallback((nextValue) => {
    setUserState((current) => {
      const resolved =
        typeof nextValue === 'function'
          ? nextValue(current)
          : nextValue;

      userRef.current = resolved;
      return resolved;
    });
  }, []);

  const refreshUser = useCallback(async ({ force = false } = {}) => {
    const now = Date.now();

    if (
      !force &&
      lastRefreshAtRef.current > 0 &&
      now - lastRefreshAtRef.current < PASSIVE_REFRESH_TTL_MS
    ) {
      return userRef.current;
    }

    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    const request = (async () => {
      try {
        const current = await authApi.me();
        let profile = current?.profile || null;

        // /auth/me có thể chỉ chứa ObjectId của media. Lấy hồ sơ đầy đủ một
        // lần trong cùng chu kỳ refresh, nhưng không tạo request trùng khi tab
        // vừa focus + pageshow + visibilitychange cùng lúc.
        try {
          const hydratedProfile = await userApi.myProfile();
          if (hydratedProfile) profile = hydratedProfile;
        } catch {
          /* Giữ profile từ /auth/me nếu endpoint hồ sơ tạm thời không khả dụng. */
        }

        const merged = { ...current, profile };
        userRef.current = merged;
        setUserState(merged);
        return merged;
      } catch {
        userRef.current = null;
        setUserState(null);
        return null;
      } finally {
        lastRefreshAtRef.current = Date.now();
        setLoading(false);
      }
    })();

    refreshPromiseRef.current = request;

    try {
      return await request;
    } finally {
      if (refreshPromiseRef.current === request) {
        refreshPromiseRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    void refreshUser({ force: true });
  }, [refreshUser]);

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        void refreshUser();
      }
    };

    const refreshOnStorage = (event) => {
      if (event.key === USER_SYNC_STORAGE_KEY) {
        void refreshUser({ force: true });
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

    try {
      profile = await userApi.myProfile();
    } catch {
      /* Hồ sơ có thể chưa được tạo. */
    }

    const merged = { ...result.user, profile };
    userRef.current = merged;
    lastRefreshAtRef.current = Date.now();
    setUserState(merged);
    setLoading(false);
    return merged;
  }, []);

  const register = useCallback(async (payload) => {
    const result = await authApi.register(payload);
    let profile = null;

    try {
      profile = await userApi.myProfile();
    } catch {
      /* Hồ sơ có thể chưa được tạo. */
    }

    const merged = { ...result.user, profile };
    userRef.current = merged;
    lastRefreshAtRef.current = Date.now();
    setUserState(merged);
    setLoading(false);
    return merged;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      userRef.current = null;
      lastRefreshAtRef.current = Date.now();
      setUserState(null);
      setLoading(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      setUser,
      loading,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
      refreshUser,
    }),
    [user, setUser, loading, login, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
