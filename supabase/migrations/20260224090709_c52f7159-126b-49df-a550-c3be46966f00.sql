-- Update password_reset template with security warning
UPDATE public.email_templates 
SET body_html = '
    <div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; 
                max-width: 600px; margin: 0 auto; background-color: #ffffff;">
      
          <div style="background-color: #ffc105; padding: 20px; text-align: center;">
            <img src="https://xzlhssqqbajqhnsmbucf.supabase.co/storage/v1/object/public/training-media/1766508615455-8wv0cee7jwr.png" alt="Logo" style="max-height: 50px; margin-bottom: 10px;" />
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">
              Resetowanie hasła
            </h1>
          </div>
        
          <div style="padding: 15px 20px;">
            <p>Cześć <strong>{{imię}}</strong>,</p><p>Otrzymaliśmy prośbę o zresetowanie hasła do Twojego konta. Kliknij poniższy przycisk, aby ustawić nowe hasło:</p>
          </div>
        
          <div style="padding: 15px 20px; text-align: center;">
            <a href="{{link_resetowania}}" 
               style="display: inline-block; background-color: #ffc105; 
                      color: #ffffff; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; font-weight: 500;">
              Zresetuj hasło
            </a>
          </div>
        
          <div style="margin: 15px 20px; padding: 15px; background-color: #fef3c7; 
                      border-left: 4px solid #f59e0b; border-radius: 4px;">
            <div style="font-weight: bold; margin-bottom: 5px;">
              ⚠️ Ważne
            </div>
            <div>Link jest ważny przez 1 godzinę.</div>
          </div>

          <div style="margin: 0 20px 15px 20px; padding: 15px; background-color: #fee2e2; 
                      border-left: 4px solid #ef4444; border-radius: 4px;">
            <div style="font-weight: bold; margin-bottom: 5px; color: #991b1b;">
              🔒 Ostrzeżenie bezpieczeństwa
            </div>
            <div style="color: #991b1b; font-size: 13px;">
              Jeżeli nie dokonywałeś zmiany hasła, zignoruj tę wiadomość, nie klikaj w żadne linki 
              oraz poinformuj nasz zespół wsparcia w osobnej wiadomości lub przez formularz kontaktowy 
              znajdujący się na stronie Pure Life Center.
            </div>
          </div>
        
          <div style="padding: 15px 20px;">
            <p>Pozdrawiamy,<br><strong>Zespół Pure Life</strong></p>
          </div>
        
          <div style="padding: 20px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
            <p style="text-align: center; color: #6b7280; font-size: 12px;">© 2024 Pure Life. Wszelkie prawa zastrzeżone.</p>
          </div>
        
    </div>
  '
WHERE internal_name = 'password_reset';

-- Update password_reset_admin template with security warning
UPDATE public.email_templates 
SET body_html = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
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

    <div style="background: #fee2e2; border: 1px solid #fca5a5; border-radius: 5px; padding: 15px; margin: 20px 0;">
      <p style="margin: 0; color: #991b1b; font-weight: bold;">🔒 Ostrzeżenie bezpieczeństwa:</p>
      <p style="margin: 10px 0 0 0; color: #991b1b; font-size: 13px;">
        Jeżeli nie dokonywałeś zmiany hasła, zignoruj tę wiadomość, nie klikaj w żadne linki 
        oraz poinformuj nasz zespół wsparcia w osobnej wiadomości lub przez formularz kontaktowy 
        znajdujący się na stronie Pure Life Center.
      </p>
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
</div>'
WHERE internal_name = 'password_reset_admin';