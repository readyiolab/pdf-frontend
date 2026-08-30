import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiService, type User } from "../services/api";
import { clearOrgId } from "@/features/org";

interface AuthContextType {
  user: User | null;
  /** Truthy when a cookie session is active (legacy name kept for route guards). */
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  googleLogin: (data: { credential: string }) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<User>;
  resendVerification: () => Promise<void>;
  applyVerifiedSession: (data: { user: User }) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Sentinel value — actual JWT lives in httpOnly cookies, not JS. */
const SESSION_MARKER = "session";

function clearClientSessionStorage() {
  localStorage.removeItem("saas_jwt_token");
  Object.keys(localStorage)
    .filter((k) => k.startsWith("diagram-ai-chat-") || k.startsWith("cloud_"))
    .forEach((k) => localStorage.removeItem(k));
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const token = user ? SESSION_MARKER : null;

  useEffect(() => {
    apiService
      .getProfile()
      .then((data) =>
        setUser({
          ...data.user,
          emailVerified: Boolean(data.user.emailVerified),
        })
      )
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      clearClientSessionStorage();
      queryClient.clear();
      clearOrgId();
    };

    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => {
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
    };
  }, [queryClient]);

  const applySession = useCallback((data: { user: User }) => {
    setUser({
      ...data.user,
      emailVerified: Boolean(data.user.emailVerified),
    });
    setLoading(false);
    void apiService
      .getProfile()
      .then((full) => {
        setUser((prev) => ({
          ...full.user,
          emailVerified: Boolean(full.user.emailVerified) || Boolean(prev?.emailVerified),
        }));
      })
      .catch(() => undefined);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    clearOrgId();
    applySession(await apiService.login(email, password));
  }, [applySession]);

  const register = useCallback(async (email: string, name: string, password: string) => {
    clearOrgId();
    applySession(await apiService.register(email, name, password));
  }, [applySession]);

  const googleLogin = useCallback(async (data: { credential: string }) => {
    clearOrgId();
    applySession(await apiService.googleLogin(data));
  }, [applySession]);

  const logout = useCallback(() => {
    apiService.logout().catch(() => undefined);
    clearClientSessionStorage();
    queryClient.clear();
    clearOrgId();
    setUser(null);
  }, [queryClient]);

  const refreshProfile = useCallback(async (): Promise<User> => {
    const data = await apiService.getProfile();
    setUser(data.user);
    return data.user;
  }, []);

  const resendVerification = useCallback(async () => {
    await apiService.resendVerification();
  }, []);

  const applyVerifiedSession = useCallback((data: { user: User }) => {
    applySession(data);
  }, [applySession]);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      login,
      register,
      googleLogin,
      logout,
      refreshProfile,
      resendVerification,
      applyVerifiedSession,
    }),
    [
      user,
      token,
      loading,
      login,
      register,
      googleLogin,
      logout,
      refreshProfile,
      resendVerification,
      applyVerifiedSession,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
