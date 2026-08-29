import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiRequest, login as loginRequest } from './api';
import type { Role, TokenResponse, User } from '../types/api';

type AuthValue = {
  token: string | null;
  refreshToken: string | null;
  role: Role | null;
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  loading: boolean;
};

const AuthContext = createContext<AuthValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('access_token'));
  const [refreshToken, setRefreshToken] = useState<string | null>(() => localStorage.getItem('refresh_token'));
  const [role, setRole] = useState<Role | null>(() => localStorage.getItem('role') as Role | null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const storeTokens = useCallback((data: TokenResponse) => {
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    localStorage.setItem('role', data.role);
    setToken(data.access_token);
    setRefreshToken(data.refresh_token);
    setRole(data.role);
  }, []);

  const loadUser = useCallback(
    async (activeToken: string) => {
      const me = await apiRequest<User>('/auth/me', {}, activeToken);
      setUser(me);
      setRole(me.role);
      localStorage.setItem('role', me.role);
      return me;
    },
    [],
  );

  const login = useCallback(
    async (username: string, password: string) => {
      const data = await loginRequest(username, password);
      storeTokens(data);
      await loadUser(data.access_token);
    },
    [storeTokens, loadUser],
  );

  const refresh = useCallback(async () => {
    if (!refreshToken) throw new Error('No refresh token');
    const data = await apiRequest<TokenResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    storeTokens(data);
    await loadUser(data.access_token);
  }, [refreshToken, storeTokens, loadUser]);

  const logout = useCallback(async () => {
    if (token) await apiRequest('/auth/logout', { method: 'POST' }, token).catch(() => undefined);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('role');
    setToken(null);
    setRefreshToken(null);
    setRole(null);
    setUser(null);
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        await loadUser(token);
      } catch {
        try {
          await refresh();
        } catch {
          await logout();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []); // run once on mount

  return <AuthContext.Provider value={{ token, refreshToken, role, user, login, logout, refresh, loading }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
