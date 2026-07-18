import React, { createContext, useContext, useState, useEffect } from "react";
import { apiService, type User } from "../services/api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<User>;
  guestSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("saas_jwt_token"));
  const [loading, setLoading] = useState(true);

  // Bootstrap ONCE on mount: a returning user with a stored token needs their
  // profile fetched. Deliberately empty deps — keying this on `token` (as it
  // used to) meant every login re-triggered a second getProfile round trip on
  // top of the login response we already had, and left `loading` stuck true
  // through that whole extra request, so login FELT slow. Login now sets the
  // user directly and this never re-runs.
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
        // Token expired/invalid — clear it so ProtectedRoute redirects cleanly.
        localStorage.removeItem("saas_jwt_token");
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Applies a fresh auth response, then enriches the profile in the background.
   *
   * The login/register/guest endpoints already return the core user (id, email,
   * name, plan), so the UI can unblock immediately. The fuller profile
   * (dailyOps counters, recent jobs) is fetched WITHOUT blocking — it fills in a
   * moment later. This is the difference between login feeling instant and
   * login waiting on a second, Redis-backed round trip before the page moves.
   */
  const applySession = (data: { token: string; user: User }) => {
    localStorage.setItem("saas_jwt_token", data.token);
    setToken(data.token);
    setUser(data.user);
    setLoading(false);
    // Fire-and-forget: enrich with dailyOps/jobs; a failure here is harmless.
    apiService.getProfile().then((full) => setUser(full.user)).catch(() => undefined);
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      applySession(await apiService.login(email, password));
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const register = async (email: string, name: string, password: string) => {
    setLoading(true);
    try {
      applySession(await apiService.register(email, name, password));
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const logout = () => {
    // Revoke the token server-side (best-effort), then clear local state.
    apiService.logout().catch(() => undefined);
    localStorage.removeItem("saas_jwt_token");
    setToken(null);
    setUser(null);
  };

  const refreshProfile = async (): Promise<User> => {
    try {
      const data = await apiService.getProfile();
      setUser(data.user);
      return data.user;
    } catch (err) {
      console.error("Failed to refresh user profile:", err);
      throw err;
    }
  };

  const guestSession = async () => {
    setLoading(true);
    try {
      // Real anonymous session issued by the server (no weak generated password).
      applySession(await apiService.guestLogin());
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        refreshProfile,
        guestSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
