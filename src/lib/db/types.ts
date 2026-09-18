export type PerfilRole = "client" | "admin" | "barber";
export type AuthProvider = "google" | "phone" | "manual";
export type AppointmentStatus =
  "pending" | "confirmed" | "completed" | "canceled" | "no_show";
export type PaymentMethod =
  "dinheiro" | "pix" | "cartao_credito" | "cartao_debito" | "outro";
export type PaymentStatus = "pending" | "paid" | "canceled";
export type MembershipRole = "owner" | "manager" | "staff";
export type LoyaltyEarningMode = "visit" | "amount" | "service";

export type SubscriptionStatus =
  | "trial"
  | "active"
  | "past_due"
  | "suspended"
  | "canceled"
  | "expired";

export type TenantUiVersion =
  | "legacy"
  | "warm-premium";

export type PlatformFeatureCode =
  | "loyalty"
  | "birthday_notifications"
  | "satisfaction_survey"
  | "email_notifications"
  | "whatsapp_notifications"
  | "advanced_reports"
  | "custom_domain";

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
  is_platform_admin?: boolean;
};

export type Barbershop = {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  primary_color: string;
  secondary_color: string;
  timezone: string;
  is_active: boolean;
  ui_version: TenantUiVersion;
  archived_at: string | null;
  archived_by: string | null;
  archive_reason: string | null;
};

export type Customer = {
  id: string;
  barbershop_id: string;
  profile_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  allow_email: boolean;
  allow_whatsapp: boolean;
};

export type Service = {
  id: string;
  barbershop_id: string;
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
  barbershop_id: string;
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
  barbershop_id: string;
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
  barbershop_id: string;
  barber_id: string;
  start_at: string;
  end_at: string;
  reason: string | null;
  created_by: string | null;
  created_at: string;
};

export type BusySlot = {
  barbershop_id?: string;
  barber_id: string;
  start_at: string;
  end_at: string;
};

export type LoyaltyProgram = {
  id: string;
  barbershop_id: string;
  name: string;
  earning_mode: LoyaltyEarningMode;
  points_per_visit: number;
  points_per_currency: number;
  is_active: boolean;
};

export type LoyaltyReward = {
  id: string;
  barbershop_id: string;
  name: string;
  reward_type:
    | "free_service"
    | "fixed_discount"
    | "percentage_discount"
    | "gift"
    | "custom";
  service_id: string | null;
  points_cost: number;
  discount_value: number | null;
  is_active: boolean;
};

export type AvailableSlot = {
  startAt: string;
  endAt: string;
  label: string;
};
