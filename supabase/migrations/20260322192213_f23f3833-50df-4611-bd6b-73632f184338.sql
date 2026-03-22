UPDATE public.partner_page_forms 
SET 
  success_message = 'Dziękujemy za wypełnienie formularza! Na podany adres email została przesłana wiadomość z poradnikiem/e-bookiem. Sprawdź również inne foldery takie jak spam.',
  post_submit_actions = '[{"type": "send_email_with_file", "bp_file_id": null}]'::jsonb
WHERE cta_key = 'darmowy-poradnik';