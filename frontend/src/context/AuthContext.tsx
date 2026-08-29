import { createContext, useContext, useEffect, useState } from 'react';
import { apiRequest, login as loginRequest } from '../services/api';
import type { Role, TokenResponse, User } from '../types/api';

type AuthContextValue = {
  token: string | null;
  refreshToken: string | null;
  role: Role | null;
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState(() => localStorage.getItem('access_token'));
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem('refresh_token'));
  const [role, setRole] = useState<Role | null>(() => (localStorage.getItem('role') as Role | null));
  const [user, setUser] = useState<User | null>(null);

  function storeTokens(data: TokenResponse) {
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    localStorage.setItem('role', data.role);
    setToken(data.access_token);
    setRefreshToken(data.refresh_token);
    setRole(data.role);
  }

  async function loadUser(activeToken: string) {
    const me = await apiRequest<User>('/auth/me', {}, activeToken);
    setUser(me);
    setRole(me.role);
  }

  async function login(username: string, password: string) {
    const data = await loginRequest(username, password);
    storeTokens(data);
    await loadUser(data.access_token);
  }

  async function refresh() {
    if (!refreshToken) return;
    const data = await apiRequest<TokenResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    storeTokens(data);
    await loadUser(data.access_token);
  }

  async function logout() {
    if (token) {
      await apiRequest('/auth/logout', { method: 'POST' }, token).catch(() => undefined);
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('role');
    setToken(null);
    setRefreshToken(null);
    setRole(null);
    setUser(null);
  }

  useEffect(() => {
    if (token) {
      loadUser(token).catch(() => refresh().catch(() => logout()));
    }
  }, []);

  return <AuthContext.Provider value={{ token, refreshToken, role, user, login, logout, refresh }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
