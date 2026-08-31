import type { TokenResponse } from './types/api';

function resolveApiUrl(): string {
  try {
    const w = typeof window !== 'undefined' ? (window as any) : null;
    if (w) {
      // ?api= query param takes precedence (e.g. https://frontend.ngrok-free.app?api=https://backend.ngrok-free.app)
      try {
        const sp = new URLSearchParams(w.location?.search || '');
        const qp = sp.get('api') || sp.get('api_url');
        if (qp) {
          w.__VITE_API_URL = qp;
          try { w.localStorage?.setItem('VITE_API_URL', qp); } catch {}
          return qp;
        }
      } catch {}
      if (typeof w.__VITE_API_URL === 'string' && w.__VITE_API_URL) return w.__VITE_API_URL;
      if (w.localStorage) {
        const ls = w.localStorage.getItem('VITE_API_URL');
        if (ls) return ls;
      }
      // allow runtime injection via window.__ENV__
      if (w.__ENV__?.VITE_API_URL) return w.__ENV__.VITE_API_URL;
    }
  } catch {}
  return (import.meta as any).env?.VITE_API_URL ?? '';
}
export const API_URL: string = resolveApiUrl();
export function setApiUrl(url: string) {
  try {
    if (typeof window !== 'undefined') {
      (window as any).__VITE_API_URL = url;
      window.localStorage?.setItem('VITE_API_URL', url);
    }
  } catch {}
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function getApiUrl() {
  // dynamic so setApiUrl / ?api= / localStorage take effect without reload
  return resolveApiUrl();
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers = new Headers(options.headers);
  const isForm = options.body instanceof FormData;
  if (!isForm && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (headers.has('Authorization')) {
    headers.set('ngrok-skip-browser-warning', 'true');
    headers.set('X-Requested-With', 'XMLHttpRequest');
  }

  const url = `${resolveApiUrl()}${path}`;
  const res = await fetch(url, { ...options, headers, credentials: 'include' });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message =
        typeof body.detail === 'string'
          ? body.detail
          : Array.isArray(body.detail)
            ? body.detail.map((d: { msg: string }) => d.msg).join(', ')
            : JSON.stringify(body.detail ?? body);
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

export async function register(payload: {
  username: string;
  email: string;
  password: string;
  phone?: string;
  role?: string;
}) {
  return apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(payload) });
}

export async function fetchMe(token: string): Promise<import('./types/api').User> {
  return apiRequest<import('./types/api').User>('/auth/me', {}, token);
}

// ---------------------------------------------------------------------------
// Rewards & Vouchers
// ---------------------------------------------------------------------------
export async function getRewardBalance(token: string): Promise<import('./types/api').RewardBalance> {
  return apiRequest<import('./types/api').RewardBalance>('/rewards/balance', {}, token);
}

export async function getRewardRates(token?: string | null): Promise<import('./types/api').RewardRates> {
  return apiRequest<import('./types/api').RewardRates>('/rewards/rates', {}, token);
}

export async function getRewardHistory(
  token: string,
  params: { page?: number; page_size?: number } = {},
): Promise<import('./types/api').PaginatedResponse<import('./types/api').RewardLedger>> {
  const qs = new URLSearchParams({ page: String(params.page ?? 1), page_size: String(params.page_size ?? 20) });
  return apiRequest<import('./types/api').PaginatedResponse<import('./types/api').RewardLedger>>(
    `/rewards/history?${qs.toString()}`,
    {},
    token,
  );
}

export async function getVouchers(token: string): Promise<import('./types/api').Voucher[]> {
  return apiRequest<import('./types/api').Voucher[]>('/vouchers', {}, token);
}

export async function getAllVouchers(token: string): Promise<import('./types/api').Voucher[]> {
  return apiRequest<import('./types/api').Voucher[]>('/vouchers/all', {}, token);
}

export async function redeemVoucher(token: string, voucherId: number): Promise<import('./types/api').RewardRedemption> {
  return apiRequest<import('./types/api').RewardRedemption>(`/vouchers/redeem/${voucherId}`, { method: 'POST' }, token);
}

export async function createVoucher(token: string, payload: Partial<import('./types/api').Voucher>) {
  return apiRequest<import('./types/api').Voucher>('/vouchers', { method: 'POST', body: JSON.stringify(payload) }, token);
}

export async function updateVoucher(token: string, id: number, payload: Partial<import('./types/api').Voucher>) {
  return apiRequest<import('./types/api').Voucher>(`/vouchers/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }, token);
}

export async function deleteVoucher(token: string, id: number) {
  return apiRequest<{ message: string }>(`/vouchers/${id}`, { method: 'DELETE' }, token);
}

export async function getRedemptions(
  token: string,
  params: { page?: number; page_size?: number } = {},
): Promise<import('./types/api').PaginatedResponse<import('./types/api').RewardRedemption>> {
  const qs = new URLSearchParams({ page: String(params.page ?? 1), page_size: String(params.page_size ?? 20) });
  return apiRequest<import('./types/api').PaginatedResponse<import('./types/api').RewardRedemption>>(
    `/vouchers/redemptions?${qs.toString()}`,
    {},
    token,
  );
}

export async function getMyRedemptions(
  token: string,
): Promise<import('./types/api').RewardRedemption[]> {
  return apiRequest<import('./types/api').RewardRedemption[]>('/vouchers/my-redemptions', {}, token);
}

export async function updateRedemptionStatus(
  token: string,
  redemptionId: number,
  status: string,
): Promise<import('./types/api').RewardRedemption> {
  return apiRequest<import('./types/api').RewardRedemption>(
    `/vouchers/redemptions/${redemptionId}?new_status=${encodeURIComponent(status)}`,
    { method: 'PATCH' },
    token,
  );
}
