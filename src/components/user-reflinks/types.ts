export type AppRole = 'admin' | 'partner' | 'specjalista' | 'client' | 'user';

export interface UserReflink {
  id: string;
  creator_user_id: string;
  target_role: AppRole;
  reflink_code: string;
  is_active: boolean;
  click_count: number;
  registration_count: number;
  created_at: string;
  expires_at: string;
  updated_at: string;
}

export interface ReflinkGenerationSettings {
  id: string;
  role: string;
  can_generate: boolean;
  allowed_target_roles: string[];
  max_links_per_user: number;
}

export interface ReflinkGlobalSettings {
  link_validity_days: number;
}

export type ReflinkStatus = 'active' | 'expiring_soon' | 'expired';

export const getRoleLabel = (role: string | AppRole): string => {
  const labels: Record<string, string> = {
    admin: 'Administrator',
    partner: 'Partner',
    specjalista: 'Specjalista',
    client: 'Klient',
    user: 'Użytkownik',
  };
  return labels[role] || role;
};

export const getReflinkStatus = (expiresAt: string): ReflinkStatus => {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysUntilExpiry <= 0) return 'expired';
  if (daysUntilExpiry <= 7) return 'expiring_soon';
  return 'active';
};

export const getDaysUntilExpiry = (expiresAt: string): number => {
  const now = new Date();
  const expiry = new Date(expiresAt);
  return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};
