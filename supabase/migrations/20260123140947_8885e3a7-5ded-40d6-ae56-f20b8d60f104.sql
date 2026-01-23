-- =====================================================
-- Email Templates for Approval Notifications
-- =====================================================

-- Template: Guardian Approval
INSERT INTO email_templates (internal_name, name, subject, body_html, is_active, variables)
VALUES (
  'guardian_approval',
  'Zatwierdzenie przez opiekuna',
  'Twoja rejestracja została zatwierdzona przez opiekuna! 🎉',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #2d5016;">Gratulacje, {{imię}}! 🎉</h1>
    <p style="font-size: 16px; line-height: 1.6;">Twoja rejestracja w systemie Pure Life została <strong>zatwierdzona przez Twojego opiekuna</strong> - {{guardian_name}}.</p>
    <div style="background-color: #f0f9e8; border-left: 4px solid #4ade80; padding: 15px; margin: 20px 0;">
      <p style="margin: 0; font-size: 14px;"><strong>Co dalej?</strong></p>
      <p style="margin: 10px 0 0 0; font-size: 14px;">Twoje konto oczekuje teraz na zatwierdzenie przez administratora. Otrzymasz kolejny email, gdy Twoje konto zostanie w pełni aktywowane.</p>
    </div>
    <p style="font-size: 14px; color: #666;">Dziękujemy za cierpliwość!</p>
    <p style="font-size: 14px;">Zespół Pure Life</p>
  </div>',
  true,
  '["imię", "nazwisko", "guardian_name"]'::jsonb
);

-- Template: Admin Approval (Full Access)
INSERT INTO email_templates (internal_name, name, subject, body_html, is_active, variables)
VALUES (
  'admin_approval',
  'Pełne zatwierdzenie konta',
  'Witamy w Pure Life! Twoje konto jest w pełni aktywne 🌿',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #2d5016;">Witamy w Pure Life, {{imię}}! 🌿</h1>
    <p style="font-size: 16px; line-height: 1.6;">Twoje konto zostało <strong>w pełni aktywowane</strong>. Masz teraz dostęp do wszystkich funkcji platformy!</p>
    
    <div style="background-color: #f0f9e8; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #2d5016;">📚 Przypisane szkolenia:</h3>
      {{training_modules_list}}
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{link_logowania}}" style="background-color: #4ade80; color: #000; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Zaloguj się do platformy</a>
    </div>
    
    <p style="font-size: 14px; color: #666;">Rozpocznij swoją przygodę z Pure Life już teraz!</p>
    <p style="font-size: 14px;">Zespół Pure Life</p>
  </div>',
  true,
  '["imię", "nazwisko", "link_logowania", "training_modules_list"]'::jsonb
);

-- Template: Training Reminder
INSERT INTO email_templates (internal_name, name, subject, body_html, is_active, variables)
VALUES (
  'training_reminder',
  'Przypomnienie o szkoleniu',
  'Kontynuuj swoje szkolenie: {{module_title}} 📚',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #2d5016;">Cześć {{imię}}! 👋</h1>
    <p style="font-size: 16px; line-height: 1.6;">Zauważyliśmy, że od <strong>{{days_inactive}} dni</strong> nie kontynuujesz szkolenia:</p>
    
    <div style="background-color: #fff3cd; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #ffc107;">
      <h3 style="margin-top: 0; color: #856404;">{{module_title}}</h3>
      <p style="margin: 0; font-size: 14px;">Twój postęp: <strong>{{progress_percent}}%</strong></p>
    </div>
    
    <p style="font-size: 16px;">Nie trać tempa! Każda ukończona lekcja przybliża Cię do sukcesu.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{training_url}}" style="background-color: #4ade80; color: #000; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Kontynuuj szkolenie</a>
    </div>
    
    <p style="font-size: 14px; color: #666;">Do zobaczenia na platformie!</p>
    <p style="font-size: 14px;">Zespół Pure Life</p>
  </div>',
  true,
  '["imię", "module_title", "progress_percent", "days_inactive", "training_url"]'::jsonb
);

-- =====================================================
-- Training Reminder Settings Table
-- =====================================================

CREATE TABLE IF NOT EXISTS training_reminder_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  days_inactive integer NOT NULL DEFAULT 7,
  reminder_interval_days integer NOT NULL DEFAULT 7,
  max_reminders integer NOT NULL DEFAULT 3,
  is_enabled boolean NOT NULL DEFAULT true,
  email_template_id uuid REFERENCES email_templates(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE training_reminder_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view/modify
CREATE POLICY "Admins can manage training reminder settings"
ON training_reminder_settings
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Insert default settings
INSERT INTO training_reminder_settings (days_inactive, reminder_interval_days, max_reminders, is_enabled)
VALUES (7, 7, 3, true);

-- =====================================================
-- Add columns to training_assignments
-- =====================================================

ALTER TABLE training_assignments
ADD COLUMN IF NOT EXISTS last_activity_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS reminder_count integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_reminder_sent_at timestamptz;

-- =====================================================
-- Trigger: Update last_activity_at on training_progress changes
-- =====================================================

CREATE OR REPLACE FUNCTION update_training_assignment_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_module_id uuid;
BEGIN
  -- Get module_id from lesson
  SELECT module_id INTO v_module_id
  FROM training_lessons
  WHERE id = NEW.lesson_id;
  
  -- Update last_activity_at in assignment
  IF v_module_id IS NOT NULL THEN
    UPDATE training_assignments
    SET last_activity_at = NOW(),
        updated_at = NOW()
    WHERE user_id = NEW.user_id
      AND module_id = v_module_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trg_update_assignment_activity ON training_progress;

CREATE TRIGGER trg_update_assignment_activity
AFTER INSERT OR UPDATE ON training_progress
FOR EACH ROW
EXECUTE FUNCTION update_training_assignment_activity();

-- =====================================================
-- RPC: Get training reminders due
-- =====================================================

CREATE OR REPLACE FUNCTION get_training_reminders_due()
RETURNS TABLE (
  assignment_id uuid,
  user_id uuid,
  module_id uuid,
  user_email text,
  user_first_name text,
  module_title text,
  days_inactive integer,
  reminder_count integer,
  progress_percent integer
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_settings record;
BEGIN
  -- Get reminder settings
  SELECT * INTO v_settings FROM training_reminder_settings LIMIT 1;
  
  -- If reminders are disabled, return empty
  IF v_settings IS NULL OR NOT v_settings.is_enabled THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    ta.id as assignment_id,
    ta.user_id,
    ta.module_id,
    p.email as user_email,
    p.first_name as user_first_name,
    tm.title as module_title,
    EXTRACT(DAY FROM (NOW() - ta.last_activity_at))::integer as days_inactive,
    ta.reminder_count,
    COALESCE(
      (SELECT COUNT(*)::integer * 100 / NULLIF(
        (SELECT COUNT(*) FROM training_lessons WHERE module_id = ta.module_id), 0
      )
      FROM training_progress tp
      JOIN training_lessons tl ON tl.id = tp.lesson_id
      WHERE tp.user_id = ta.user_id 
        AND tl.module_id = ta.module_id 
        AND tp.is_completed = true
      ), 0
    )::integer as progress_percent
  FROM training_assignments ta
  JOIN profiles p ON p.user_id = ta.user_id
  JOIN training_modules tm ON tm.id = ta.module_id
  WHERE ta.is_completed = false
    AND ta.last_activity_at < NOW() - (v_settings.days_inactive || ' days')::interval
    AND ta.reminder_count < v_settings.max_reminders
    AND (
      ta.last_reminder_sent_at IS NULL 
      OR ta.last_reminder_sent_at < NOW() - (v_settings.reminder_interval_days || ' days')::interval
    )
    AND p.email IS NOT NULL
    AND p.admin_approved = true;
END;
$$;