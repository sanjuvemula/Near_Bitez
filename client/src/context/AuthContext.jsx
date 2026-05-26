import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api } from "../services/api.js";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);

  const refreshUser = useCallback(async () => {
    try {
      const response = await api.get("/auth/me");
      setUser(response.user);
      return response.user;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
      setAuthReady(true);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(
    async (role, formData) => {
      const response = await api.post(`/auth/${role}/login`, formData);
      setUser(response.user);
      return response.user;
    },
    []
  );

  const register = useCallback(
    async (role, formData) => {
      const response = await api.post(`/auth/${role}/register`, formData);
      setUser(response.user);
      return response.user;
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout", {});
    } catch {
      // Clear the local session even if the cookie was already expired.
    }
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (payload) => {
    const response = await api.patch("/auth/me", payload);
    setUser(response.user);
    return response.user;
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      loading,
      authReady,
      login,
      register,
      logout,
      refreshUser,
      updateProfile,
    }),
    [authReady, loading, login, logout, refreshUser, register, updateProfile, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};



