// Types for Team Contacts module

export type ContactType = 'private' | 'team_member';

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
  
  // Contact type: private (CRM) or team_member (registered user)
  contact_type: ContactType;
  linked_user_id: string | null;
  
  // Basic fields
  address: string | null;
  phone_number: string | null;
  email: string | null;
  profession: string | null;
  
  // Contact's upline (not user's upline)
  contact_upline_eq_id: string | null;
  contact_upline_first_name: string | null;
  contact_upline_last_name: string | null;
  
  // Relationship status
  relationship_status: 'active' | 'suspended' | 'closed_success' | 'closed_not_now' | 'observation' | 'potential_partner' | 'potential_specialist' | null;
  
  // Products
  products: string | null;
  
  // Reminder fields
  next_contact_date: string | null;
  reminder_date: string | null;
  reminder_note: string | null;
  reminder_sent: boolean;
  
  // Client-specific fields
  purchased_product: string | null;
  purchase_date: string | null;
  client_status: 'active' | 'inactive' | null;
  
  // Partner/Specialist fields
  collaboration_level: string | null;
  start_date: string | null;
  partner_status: 'active' | 'suspended' | null;
  
  is_active: boolean;
  
  // Deleted user tracking
  linked_user_deleted_at: string | null;
  
  // Approval status from linked profile (for team members)
  linked_guardian_approved?: boolean | null;
  linked_admin_approved?: boolean | null;
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
  relationshipStatus?: string;
  contactType?: ContactType; // Filter by contact type
}

export interface UplineInfo {
  upline_eq_id: string | null;
  upline_first_name: string | null;
  upline_last_name: string | null;
}

// For team map visualization
export interface TeamMapNode {
  id: string;
  name: string;
  eq_id: string | null;
  role: string;
  upline_eq_id: string | null;
  children: TeamMapNode[];
}

// For organization tree visualization
export interface OrganizationMember {
  id: string;
  first_name: string | null;
  last_name: string | null;
  eq_id: string | null;
  upline_eq_id: string | null;
  role: string | null;
  avatar_url: string | null;
  email: string | null;
  phone_number: string | null;
  level: number;
}

export interface OrganizationTreeNode extends OrganizationMember {
  children: OrganizationTreeNode[];
  childCount: number;
}
