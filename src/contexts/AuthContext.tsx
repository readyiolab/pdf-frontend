import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { apiService, type User } from "../services/api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  googleLogin: (data: { credential: string }) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<User>;
  guestSession: () => Promise<void>;
  resendVerification: () => Promise<void>;
  applyVerifiedSession: (data: { token: string; user: User }) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("saas_jwt_token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("saas_jwt_token");
    if (!stored) {
      setLoading(false);
      return;
    }
    apiService
      .getProfile()
      .then((data) => setUser(data.user))
      .catch(() => {
        localStorage.removeItem("saas_jwt_token");
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const applySession = useCallback((data: { token: string; user: User }) => {
    localStorage.setItem("saas_jwt_token", data.token);
    setToken(data.token);
    setUser(data.user);
    setLoading(false);
    // Refresh profile in background — do not block the auth UI.
    void apiService.getProfile().then((full) => setUser(full.user)).catch(() => undefined);
  }, []);

  // Important: do NOT flip global `loading` during login/register/guest.
  // That was painting a second full-page spinner over the auth modal.

  const login = useCallback(async (email: string, password: string) => {
    applySession(await apiService.login(email, password));
  }, [applySession]);

  const register = useCallback(async (email: string, name: string, password: string) => {
    applySession(await apiService.register(email, name, password));
  }, [applySession]);

  const googleLogin = useCallback(async (data: { credential: string }) => {
    applySession(await apiService.googleLogin(data));
  }, [applySession]);

  const logout = useCallback(() => {
    apiService.logout().catch(() => undefined);
    localStorage.removeItem("saas_jwt_token");
    setToken(null);
    setUser(null);
  }, []);

  const refreshProfile = useCallback(async (): Promise<User> => {
    const data = await apiService.getProfile();
    setUser(data.user);
    return data.user;
  }, []);

  const guestSession = useCallback(async () => {
    applySession(await apiService.guestLogin());
  }, [applySession]);

  const resendVerification = useCallback(async () => {
    await apiService.resendVerification();
  }, []);

  const applyVerifiedSession = useCallback((data: { token: string; user: User }) => {
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
      guestSession,
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
      guestSession,
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
