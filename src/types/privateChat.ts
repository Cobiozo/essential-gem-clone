export interface PrivateChatParticipant {
  id: string;
  thread_id: string;
  user_id: string;
  joined_at: string;
  is_active: boolean;
  // Joined data
  profile?: {
    first_name: string | null;
    last_name: string | null;
    email: string;
    specialization?: string | null;
  };
}

export interface PrivateChatThread {
  id: string;
  initiator_id: string;
  participant_id: string | null;
  status: 'active' | 'closed' | 'archived';
  subject: string | null;
  is_group?: boolean;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  last_message_at: string | null;
  // Joined data
  initiator?: {
    first_name: string | null;
    last_name: string | null;
    email: string;
    specialization?: string | null;
  };
  participant?: {
    first_name: string | null;
    last_name: string | null;
    email: string;
    specialization?: string | null;
  };
  // For group chats
  participants?: PrivateChatParticipant[];
  unread_count?: number;
}

export interface PrivateChatMessage {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  // Joined data
  sender?: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  };
}

export interface CreateThreadData {
  participant_id: string;
  subject?: string;
  initial_message?: string;
}

export interface CreateGroupThreadData {
  participant_ids: string[];
  subject: string;
  initial_message?: string;
}
