export type Role = 'user' | 'collector' | 'recycler' | 'management';

export type User = {
  id: number;
  username: string;
  email: string;
  phone?: string | null;
  role: Role;
  created_at: string;
  is_active: boolean;
};

export type TokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: 'bearer';
  role: Role;
};

export type PublicBin = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  accepted_waste_types: string[];
  capacity_kg: number;
  created_by: number;
  created_at: string;
  updated_at: string;
};

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
};

export type PickupRequest = {
  id: number;
  user_id: number;
  collector_id?: number | null;
  waste_type: string;
  quantity_kg: number;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  preferred_time?: string | null;
  status: string;
  requested_at: string;
  collected_at?: string | null;
};

export type WasteBatch = {
  id: number;
  pickup_request_id: number;
  recycler_id?: number | null;
  status: string;
  handed_over_at?: string | null;
  processed_at?: string | null;
  proof_url?: string | null;
};
