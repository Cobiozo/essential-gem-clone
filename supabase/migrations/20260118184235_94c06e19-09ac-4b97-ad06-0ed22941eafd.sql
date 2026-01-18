-- Create table to track sent meeting reminders (to avoid duplicates)
CREATE TABLE public.meeting_reminders_sent (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('24h', '1h')),
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id, reminder_type)
);

-- Enable RLS
ALTER TABLE public.meeting_reminders_sent ENABLE ROW LEVEL SECURITY;

-- Only allow service role to insert/select (edge function uses service role)
CREATE POLICY "Service role only" ON public.meeting_reminders_sent
  FOR ALL USING (false);

-- Create index for faster queries
CREATE INDEX idx_meeting_reminders_event ON public.meeting_reminders_sent(event_id);
CREATE INDEX idx_meeting_reminders_user ON public.meeting_reminders_sent(user_id);

-- Create email templates for reminders
INSERT INTO email_templates (name, internal_name, subject, body_html, is_active, variables) VALUES (
  'Przypomnienie o spotkaniu (24h)',
  'meeting_reminder_24h',
  '⏰ Przypomnienie: {{temat}} jutro o {{godzina_spotkania}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Przypomnienie o spotkaniu</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">⏰ Przypomnienie o spotkaniu</h1>
  </div>
  
  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">Cześć <strong>{{imię}}</strong>!</p>
    
    <p style="font-size: 16px;">Przypominamy, że <strong>jutro</strong> masz zaplanowane spotkanie.</p>
    
    <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #3b82f6;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; font-weight: bold; width: 120px;">📋 Temat:</td>
          <td style="padding: 8px 0;">{{temat}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">📅 Data:</td>
          <td style="padding: 8px 0;">{{data_spotkania}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">🕐 Godzina:</td>
          <td style="padding: 8px 0;">{{godzina_spotkania}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">👤 Z kim:</td>
          <td style="padding: 8px 0;">{{druga_strona}}</td>
        </tr>
      </table>
    </div>
    
    <p style="font-size: 14px; color: #666;">Link do spotkania Zoom znajdziesz w aplikacji w widżecie "Moje spotkania".</p>
    
    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      Pozdrawiamy,<br>
      <strong>Zespół Pure Life</strong>
    </p>
  </div>
</body>
</html>',
  true,
  '["imię", "temat", "data_spotkania", "godzina_spotkania", "druga_strona"]'
);

INSERT INTO email_templates (name, internal_name, subject, body_html, is_active, variables) VALUES (
  'Przypomnienie o spotkaniu (1h)',
  'meeting_reminder_1h',
  '🔔 Spotkanie za godzinę: {{temat}} o {{godzina_spotkania}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Spotkanie za godzinę</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">🔔 Spotkanie za godzinę!</h1>
  </div>
  
  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">Cześć <strong>{{imię}}</strong>!</p>
    
    <p style="font-size: 16px;">Twoje spotkanie rozpocznie się <strong>za około godzinę</strong>.</p>
    
    <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #f59e0b;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; font-weight: bold; width: 120px;">📋 Temat:</td>
          <td style="padding: 8px 0;">{{temat}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">🕐 Godzina:</td>
          <td style="padding: 8px 0;">{{godzina_spotkania}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">👤 Z kim:</td>
          <td style="padding: 8px 0;">{{druga_strona}}</td>
        </tr>
      </table>
    </div>
    
    <p style="font-size: 14px; color: #666;">Przygotuj się do spotkania! Link do Zoom znajdziesz w aplikacji.</p>
    
    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      Pozdrawiamy,<br>
      <strong>Zespół Pure Life</strong>
    </p>
  </div>
</body>
</html>',
  true,
  '["imię", "temat", "godzina_spotkania", "druga_strona"]'
);