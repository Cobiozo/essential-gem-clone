// Types for Team Contacts module

export interface TeamContact {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  eq_id: string | null;
  role: 'client' | 'partner' | 'specjalista';
  created_at: string;
  updated_at: string;
  added_at: string;
  notes: string | null;
  
  // Client-specific fields
  purchased_product: string | null;
  purchase_date: string | null;
  client_status: 'active' | 'inactive' | null;
  
  // Partner/Specialist fields
  collaboration_level: string | null;
  start_date: string | null;
  partner_status: 'active' | 'suspended' | null;
  
  is_active: boolean;
}

export interface TeamContactHistory {
  id: string;
  contact_id: string;
  change_type: string;
  previous_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  changed_by: string;
  created_at: string;
}

export interface UserNotification {
  id: string;
  user_id: string;
  notification_type: string;
  source_module: string;
  title: string;
  message: string;
  link: string | null;
  metadata: Record<string, any>;
  related_contact_id: string | null;
  sender_id: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface TeamContactFilters {
  role: string;
  status: string;
  dateFrom: string;
  dateTo: string;
  search: string;
  userId?: string; // For admin filtering by user
}

export interface UplineInfo {
  upline_eq_id: string | null;
  upline_first_name: string | null;
  upline_last_name: string | null;
}
