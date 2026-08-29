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

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
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
  status: 'pending' | 'assigned' | 'en_route' | 'collected' | 'declined' | 'cancelled';
  requested_at: string;
  collected_at?: string | null;
};

export type WasteBatch = {
  id: number;
  pickup_request_id: number;
  recycler_id?: number | null;
  status: 'available' | 'requested' | 'accepted' | 'processing' | 'completed';
  handed_over_at?: string | null;
  processed_at?: string | null;
  proof_url?: string | null;
};

export type Collector = {
  id: number;
  user_id: number;
  service_area: string;
  is_available: boolean;
};

export type Recycler = {
  id: number;
  user_id: number;
  accepted_waste_types: string[];
  capacity_kg: number;
  rating: number;
};

export type AuditLog = {
  id: number;
  actor_user_id: number;
  action: string;
  entity_type: string;
  entity_id: number;
  timestamp: string;
};

export type Report = {
  id: number;
  generated_by: number;
  report_type: string;
  file_url: string;
  created_at: string;
};

export type DashboardSummary = {
  users: Record<string, number>;
  pickup_pipeline: Record<string, number>;
  batches: Record<string, number>;
  total_waste_kg: number;
  public_bins: number;
  by_waste_type?: Array<{ waste_type: string; total_kg: number; count: number }>;
};

export type UserAnalytics = {
  total_pickups: number;
  completed_pickups: number;
  total_kg_contributed: number;
  by_waste_type: Array<{ waste_type: string; total_kg: number; count: number }>;
};

export type CollectorAnalytics = DashboardSummary;
export type RecyclerAnalytics = {
  total_batches: number;
  completed_batches: number;
  total_kg_processed: number;
  by_waste_type: Array<{ waste_type: string; total_kg: number; count: number }>;
};
