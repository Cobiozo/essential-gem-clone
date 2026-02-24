UPDATE public.email_templates
SET body_html = REPLACE(body_html, 'Administrator <strong>{{admin_name}}</strong> wygenerował', '<strong>Administrator Pure Life Center</strong> wygenerował'),
    updated_at = now()
WHERE internal_name = 'password_reset_admin';