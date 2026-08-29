import type { TokenResponse } from '../types/api';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function getApiUrl() {
  return API_URL;
}

export async function apiRequest<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const headers = new Headers(options.headers);
  const isForm = options.body instanceof FormData;
  if (!isForm && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, { ...options, headers, credentials: 'include' });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = typeof body.detail === 'string' ? body.detail : Array.isArray(body.detail) ? body.detail.map((d: { msg: string }) => d.msg).join(', ') : JSON.stringify(body.detail ?? body);
    } catch {
      try {
        message = await res.text();
      } catch {}
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

export async function login(username: string, password: string): Promise<TokenResponse> {
  return apiRequest<TokenResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function register(payload: { username: string; email: string; password: string; phone?: string; role?: string }) {
  return apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(payload) });
}
