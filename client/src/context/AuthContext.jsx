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
const MEDIA_OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/i;

function profileNeedsHydration(profile) {
  if (!profile || typeof profile !== 'object') return true;

  if (!Object.prototype.hasOwnProperty.call(profile, 'avatarMediaId')) {
    return true;
  }

  const avatar = profile.avatarMediaId;

  // /auth/me on some server versions returns only the raw media ObjectId.
  // Avatar/mediaUrl needs the populated media object (url/secureUrl/storagePath)
  // in order to render the actual image in the global header.
  return (
    typeof avatar === 'string' &&
    MEDIA_OBJECT_ID_PATTERN.test(avatar.trim())
  );
}

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
        let profile = current?.profile ?? null;

        // Hydrate when /auth/me omits the profile OR only exposes an unresolved
        // avatar media ObjectId. This keeps the header avatar in sync with the
        // full account profile without adding an extra request when the profile
        // is already populated.
        if (
          !Object.prototype.hasOwnProperty.call(current || {}, 'profile') ||
          profileNeedsHydration(profile)
        ) {
          try {
            const hydratedProfile = await userApi.myProfile();
            if (hydratedProfile) {
              profile = {
                ...(profile || {}),
                ...hydratedProfile,
              };
            }
          } catch {
            /* Backend cũ có thể không có hồ sơ; giữ dữ liệu hiện có. */
          }
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
