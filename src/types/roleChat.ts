export interface RoleChatChannel {
  id: string;
  channel_type: string;
  sender_role: string;
  target_role: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoleChatMessage {
  id: string;
  channel_id: string | null;
  sender_id: string;
  sender_role: string;
  recipient_role: string;
  recipient_id: string | null;
  content: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  sender_name?: string;
}

export const ROLE_HIERARCHY: Record<string, number> = {
  admin: 100,
  partner: 75,
  specjalista: 50,
  client: 25,
};

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrator',
  lider: 'Lider',
  partner: 'Partner',
  specjalista: 'Specjalista',
  client: 'Klient',
};

export const canSendToRole = (senderRole: string, targetRole: string): boolean => {
  return (ROLE_HIERARCHY[senderRole] || 0) >= (ROLE_HIERARCHY[targetRole] || 0);
};

export const getRolesUserCanMessageTo = (userRole: string): string[] => {
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  return Object.entries(ROLE_HIERARCHY)
    .filter(([_, level]) => level <= userLevel && level < userLevel)
    .map(([role]) => role);
};
