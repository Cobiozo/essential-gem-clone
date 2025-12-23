-- Create email templates for: training_assigned, specialist_message, password_reset_admin

-- 1. Training Assigned Template
INSERT INTO public.email_templates (
  internal_name,
  name, 
  subject, 
  body_html, 
  is_active, 
  variables
) VALUES (
  'training_assigned',
  'Powiadomienie o przypisanym szkoleniu',
  'Nowe szkolenie: {{module_title}}',
  '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1>🎓 Nowe szkolenie dla Ciebie!</h1>
  </div>
  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
    <p>Witaj {{imię}}!</p>
    <p>{{assigner_name}} przypisał(a) Ci nowe szkolenie:</p>
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
      <h2 style="margin-top: 0; color: #667eea;">{{module_title}}</h2>
      <p style="margin-bottom: 0;">{{module_description}}</p>
    </div>
    <p>Kliknij poniższy przycisk, aby rozpocząć szkolenie:</p>
    <div style="text-align: center;">
      <a href="{{training_url}}" style="display: inline-block; background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0;">
        Rozpocznij szkolenie →
      </a>
    </div>
    <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
      Możesz również przejść do szkolenia logując się do swojego konta i wybierając zakładkę "Szkolenia".
    </p>
  </div>
  <div style="text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px;">
    <p>Pure Life Training System</p>
    <p>Ta wiadomość została wysłana automatycznie. Nie odpowiadaj na nią.</p>
  </div>
</div>',
  true,
  '["imię", "module_title", "module_description", "assigner_name", "training_url"]'::jsonb
) ON CONFLICT (internal_name) DO UPDATE SET
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  body_html = EXCLUDED.body_html,
  variables = EXCLUDED.variables;

-- 2. Specialist Message Template
INSERT INTO public.email_templates (
  internal_name,
  name, 
  subject, 
  body_html, 
  is_active, 
  variables
) VALUES (
  'specialist_message',
  'Wiadomość do specjalisty',
  '[Wiadomość od użytkownika] {{subject}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #10b981;">Nowa wiadomość od użytkownika</h2>
  <p><strong>Od:</strong> {{sender_name}} ({{sender_email}})</p>
  <p><strong>Temat:</strong> {{subject}}</p>
  <hr style="border: 1px solid #e5e7eb; margin: 20px 0;" />
  <div style="white-space: pre-wrap;">{{message}}</div>
  {{attachments_html}}
  <hr style="border: 1px solid #e5e7eb; margin: 20px 0;" />
  <p style="color: #6b7280; font-size: 12px;">
    Ta wiadomość została wysłana przez system Pure Life. 
    Możesz odpowiedzieć bezpośrednio na ten e-mail.
  </p>
</div>',
  true,
  '["sender_name", "sender_email", "subject", "message", "attachments_html"]'::jsonb
) ON CONFLICT (internal_name) DO UPDATE SET
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  body_html = EXCLUDED.body_html,
  variables = EXCLUDED.variables;

-- 3. Password Reset Admin Template
INSERT INTO public.email_templates (
  internal_name,
  name, 
  subject, 
  body_html, 
  is_active, 
  variables
) VALUES (
  'password_reset_admin',
  'Reset hasła przez administratora',
  'Nowe hasło do konta Pure Life',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Pure Life</h1>
    <p style="color: #f0f0f0; margin: 10px 0 0 0;">Nowe hasło do Twojego konta</p>
  </div>
  
  <div style="padding: 30px; background: white;">
    <h2 style="color: #333; margin-bottom: 20px;">Witaj!</h2>
    
    <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
      Administrator <strong>{{admin_name}}</strong> wygenerował dla Ciebie nowe hasło do systemu Pure Life.
    </p>
    
    <div style="background: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0;">
      <p style="margin: 0; color: #333;"><strong>Email:</strong> {{user_email}}</p>
      <p style="margin: 10px 0 0 0; color: #333;"><strong>Nowe hasło:</strong></p>
      <div style="font-family: monospace; font-size: 18px; font-weight: bold; color: #667eea; background: white; padding: 15px; border-radius: 5px; margin-top: 10px; word-break: break-all;">
        {{new_password}}
      </div>
    </div>
    
    <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
      <p style="margin: 0; color: #856404; font-weight: bold;">⚠️ Ważne przypomnienie bezpieczeństwa:</p>
      <ul style="margin: 10px 0 0 0; color: #856404; padding-left: 20px;">
        <li>Zaloguj się jak najszybciej i zmień hasło na własne</li>
        <li>Nie udostępniaj tego hasła nikomu</li>
        <li>Usuń tego emaila po zalogowaniu</li>
      </ul>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{login_url}}" 
         style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold;">
        Zaloguj się do systemu
      </a>
    </div>
    
    <p style="color: #999; font-size: 14px; text-align: center; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
      Ten email został wysłany automatycznie przez system Pure Life.<br>
      Jeśli nie oczekiwałeś tego emaila, skontaktuj się z administratorem.
    </p>
  </div>
</div>',
  true,
  '["admin_name", "user_email", "new_password", "login_url"]'::jsonb
) ON CONFLICT (internal_name) DO UPDATE SET
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  body_html = EXCLUDED.body_html,
  variables = EXCLUDED.variables;

-- Create notification event types linked to the new templates

-- training_assigned event type
INSERT INTO public.notification_event_types (
  event_key, 
  name, 
  description, 
  source_module, 
  icon_name,
  color,
  is_active, 
  send_email, 
  email_template_id,
  position
)
SELECT 
  'training_assigned', 
  'Przypisanie szkolenia', 
  'Nowe szkolenie zostało przypisane użytkownikowi',
  'training',
  'GraduationCap',
  '#667eea',
  true,
  true,
  et.id,
  (SELECT COALESCE(MAX(position), 0) + 1 FROM public.notification_event_types)
FROM public.email_templates et 
WHERE et.internal_name = 'training_assigned'
ON CONFLICT (event_key) DO UPDATE SET
  send_email = true,
  email_template_id = EXCLUDED.email_template_id;

-- specialist_message event type
INSERT INTO public.notification_event_types (
  event_key, 
  name, 
  description, 
  source_module, 
  icon_name,
  color,
  is_active, 
  send_email, 
  email_template_id,
  position
)
SELECT 
  'specialist_message', 
  'Wiadomość do specjalisty', 
  'Użytkownik wysłał wiadomość do specjalisty',
  'specialist_search',
  'MessageSquare',
  '#10b981',
  true,
  true,
  et.id,
  (SELECT COALESCE(MAX(position), 0) + 1 FROM public.notification_event_types)
FROM public.email_templates et 
WHERE et.internal_name = 'specialist_message'
ON CONFLICT (event_key) DO UPDATE SET
  send_email = true,
  email_template_id = EXCLUDED.email_template_id;

-- password_reset_admin event type
INSERT INTO public.notification_event_types (
  event_key, 
  name, 
  description, 
  source_module, 
  icon_name,
  color,
  is_active, 
  send_email, 
  email_template_id,
  position
)
SELECT 
  'password_reset_admin', 
  'Reset hasła przez administratora', 
  'Administrator zresetował hasło użytkownika',
  'admin',
  'KeyRound',
  '#f59e0b',
  true,
  true,
  et.id,
  (SELECT COALESCE(MAX(position), 0) + 1 FROM public.notification_event_types)
FROM public.email_templates et 
WHERE et.internal_name = 'password_reset_admin'
ON CONFLICT (event_key) DO UPDATE SET
  send_email = true,
  email_template_id = EXCLUDED.email_template_id;