
-- Add 14 new delegated permission columns to leader_permissions
ALTER TABLE public.leader_permissions
  ADD COLUMN IF NOT EXISTS can_create_team_events boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_event_registrations boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_team_training boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_knowledge_base boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_send_team_notifications boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_send_team_emails boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_send_team_push boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_view_team_contacts boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_team_contacts boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_daily_signal boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_important_info boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_team_reflinks boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_view_team_reports boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_certificates boolean DEFAULT false;
