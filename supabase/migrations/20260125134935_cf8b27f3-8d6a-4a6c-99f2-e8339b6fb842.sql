-- Step 1: Create email template for new training lessons
INSERT INTO email_templates (
  id,
  name,
  internal_name,
  subject,
  body_html,
  footer_html,
  is_active
)
VALUES (
  gen_random_uuid(),
  'Nowe materiały szkoleniowe',
  'training_new_lessons',
  'Nowa lekcja w module: {{module_title}} 📚',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #16a34a;">Cześć {{imię}}!</h1>
    <p style="font-size: 16px; line-height: 1.6;">
      Do modułu szkoleniowego <strong>{{module_title}}</strong> została dodana nowa lekcja:
    </p>
    <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 15px; margin: 20px 0;">
      <strong style="font-size: 18px;">{{lesson_title}}</strong>
    </div>
    <p style="font-size: 16px; line-height: 1.6;">
      {{message}}
    </p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{link}}" 
         style="display: inline-block; background-color: #16a34a; color: white; padding: 12px 30px; 
                text-decoration: none; border-radius: 6px; font-weight: bold;">
        Przejdź do szkolenia
      </a>
    </div>
  </div>',
  '<div style="text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
    <p>Ta wiadomość została wysłana automatycznie z platformy Pure Life.</p>
  </div>',
  true
);

-- Step 2: Create notification event type with email template reference
DO $$
DECLARE
  template_uuid UUID;
BEGIN
  SELECT id INTO template_uuid FROM email_templates WHERE internal_name = 'training_new_lessons' LIMIT 1;
  
  INSERT INTO notification_event_types (
    event_key, 
    name, 
    description, 
    icon_name, 
    color, 
    source_module, 
    send_email, 
    email_template_id,
    is_active,
    position
  )
  VALUES (
    'training_new_lessons',
    'Nowe materiały szkoleniowe',
    'Powiadomienie o dodaniu nowych lekcji do modułu szkoleniowego',
    'BookOpen',
    '#3b82f6',
    'training',
    true,
    template_uuid,
    true,
    10
  );
END $$;