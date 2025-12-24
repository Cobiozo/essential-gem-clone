export interface PrivateChatThread {
  id: string;
  initiator_id: string;
  participant_id: string;
  status: 'active' | 'closed' | 'archived';
  subject: string | null;
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
