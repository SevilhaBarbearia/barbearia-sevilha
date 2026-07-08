export type PerfilRole = 'client' | 'admin' | 'barber';
export type AuthProvider = 'google' | 'phone' | 'manual';
export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'canceled' | 'no_show';
export type PaymentMethod = 'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito' | 'outro';
export type PaymentStatus = 'pending' | 'paid' | 'canceled';

export type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: PerfilRole;
  provider: AuthProvider;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  is_active: boolean;
};

export type Service = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  image_url: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type Barber = {
  id: string;
  profile_id: string | null;
  name: string;
  bio: string | null;
  photo_url: string | null;
  phone: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type BusinessHour = {
  id: string;
  barber_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  break_start: string | null;
  break_end: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type BlockedSlot = {
  id: string;
  barber_id: string;
  start_at: string;
  end_at: string;
  reason: string | null;
  created_by: string | null;
  created_at: string;
};

export type BusySlot = {
  barber_id: string;
  start_at: string;
  end_at: string;
};

export type AvailableSlot = {
  startAt: string;
  endAt: string;
  label: string;
};
