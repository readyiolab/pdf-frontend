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

  // Refresh profile details on mount if we have a token
  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const data = await apiService.getProfile();
          setUser(data.user);
        } catch (err) {
          console.error("Auth initialization failed:", err);
          // Token expired or invalid
          localStorage.removeItem("saas_jwt_token");
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, [token]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const data = await apiService.login(email, password);
      localStorage.setItem("saas_jwt_token", data.token);
      setToken(data.token);
      setUser(data.user);
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const register = async (email: string, name: string, password: string) => {
    setLoading(true);
    try {
      const data = await apiService.register(email, name, password);
      localStorage.setItem("saas_jwt_token", data.token);
      setToken(data.token);
      setUser(data.user);
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
      const data = await apiService.guestLogin();
      localStorage.setItem("saas_jwt_token", data.token);
      setToken(data.token);
      setUser(data.user);
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
