import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { STORAGE_KEYS } from "@/constants/config";
import { authApi } from "@/services/api";
import { ApiError, setUnauthorizedHandler } from "@/services/apiClient";
import { disconnectSocket, joinUserRoom, reconnectSocket } from "@/services/socket";
import {
  clearToken,
  getToken,
  readJson,
  removeKey,
  saveJson,
  saveToken,
} from "@/services/storage";
import type { User, UserRole } from "@/types/models";

export type AuthMode = "customer" | "vendor";

interface AuthContextValue {
  user: User | null;
  role: UserRole | null;
  /** False until the stored session has been checked — gates navigation. */
  ready: boolean;
  busy: boolean;
  error: string | null;
  login: (mode: AuthMode, email: string, password: string) => Promise<void>;
  register: (
    mode: AuthMode,
    payload: { name: string; email: string; password: string; phone?: string }
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  role: null,
  ready: false,
  busy: false,
  error: null,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
  clearError: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearSession = useCallback(async () => {
    setUser(null);
    await clearToken();
    await removeKey(STORAGE_KEYS.user);
    disconnectSocket();
  }, []);

  // A 401 anywhere means the token is dead — drop the session so navigation
  // sends the user back to the login stack.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      void clearSession();
    });
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  /**
   * Restore on launch: show the cached profile immediately so there's no blank
   * frame, then revalidate against /auth/me. If the token is stale the 401
   * handler above clears everything.
   */
  useEffect(() => {
    let active = true;

    const restore = async () => {
      const token = await getToken();
      if (!token) {
        if (active) setReady(true);
        return;
      }

      const cached = await readJson<User>(STORAGE_KEYS.user);
      if (active && cached) setUser(cached);

      try {
        const fresh = await authApi.me();
        if (!active) return;
        setUser(fresh);
        await saveJson(STORAGE_KEYS.user, fresh);
        await reconnectSocket();
        await joinUserRoom(fresh._id, fresh.role);
      } catch (err) {
        // Network failures keep the cached session; only auth failures clear it.
        if (err instanceof ApiError && err.isAuthError) {
          await clearSession();
        }
      } finally {
        if (active) setReady(true);
      }
    };

    void restore();
    return () => {
      active = false;
    };
  }, [clearSession]);

  const persistSession = useCallback(
    async (nextUser: User, token?: string) => {
      if (token) await saveToken(token);
      setUser(nextUser);
      await saveJson(STORAGE_KEYS.user, nextUser);
      await reconnectSocket();
      // Without this the server never routes order/notification events here.
      await joinUserRoom(nextUser._id, nextUser.role);
    },
    []
  );

  const login = useCallback(
    async (mode: AuthMode, email: string, password: string) => {
      setBusy(true);
      setError(null);
      try {
        const response =
          mode === "vendor"
            ? await authApi.vendorLogin(email, password)
            : await authApi.customerLogin(email, password);

        if (!response.token) {
          // The backend returns the JWT in the body for native clients. If it
          // is missing, the server predates that change.
          throw new ApiError(
            "This app needs an updated NearBitez server. Please try again later.",
            0
          );
        }

        await persistSession(response.user, response.token);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Login failed");
        throw err;
      } finally {
        setBusy(false);
      }
    },
    [persistSession]
  );

  const register = useCallback(
    async (
      mode: AuthMode,
      payload: { name: string; email: string; password: string; phone?: string }
    ) => {
      setBusy(true);
      setError(null);
      try {
        const response =
          mode === "vendor"
            ? await authApi.vendorRegister(payload)
            : await authApi.customerRegister(payload);

        if (response.token) {
          await persistSession(response.user, response.token);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not create account");
        throw err;
      } finally {
        setBusy(false);
      }
    },
    [persistSession]
  );

  const logout = useCallback(async () => {
    setBusy(true);
    try {
      await authApi.logout();
    } catch {
      // Local sign-out must succeed even if the network call fails.
    } finally {
      await clearSession();
      setBusy(false);
    }
  }, [clearSession]);

  const refreshUser = useCallback(async () => {
    try {
      const fresh = await authApi.me();
      setUser(fresh);
      await saveJson(STORAGE_KEYS.user, fresh);
    } catch {
      // Keep the current user; the 401 handler covers expired sessions.
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role: user?.role ?? null,
      ready,
      busy,
      error,
      login,
      register,
      logout,
      refreshUser,
      clearError: () => setError(null),
    }),
    [busy, error, login, logout, ready, refreshUser, register, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
