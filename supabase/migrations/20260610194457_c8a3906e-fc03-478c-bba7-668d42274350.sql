
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS activation_token text,
  ADD COLUMN IF NOT EXISTS activation_token_expires_at timestamptz;

CREATE INDEX IF NOT EXISTS profiles_activation_token_idx
  ON public.profiles (activation_token)
  WHERE activation_token IS NOT NULL;

UPDATE public.email_templates
SET
  subject = 'Witamy w Pure Life Center — Twoje konto jest aktywne!',
  body_html = '<div style="font-family:Arial,sans-serif;color:#222;line-height:1.6;">
    <h1 style="color:#B8912A;margin-top:0;">Witamy w Pure Life Center, {{imię}}!</h1>
    <p>Z radością informujemy, że <strong>Twoje konto zostało zatwierdzone przez Administratora</strong> i jest teraz w pełni aktywne.</p>
    <h2 style="color:#222;font-size:18px;margin-top:24px;">Co dalej?</h2>
    <p>Zaloguj się do systemu i rozpocznij swoją przygodę z platformą Pure Life Center. Czeka na Ciebie pełen panel narzędzi, materiały edukacyjne oraz społeczność.</p>
    {{training_modules_list}}
    <div style="text-align:center;margin:32px 0;">
      <a href="{{link_logowania}}"
         style="display:inline-block;background:linear-gradient(135deg,#D4A843,#B8912A);color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:bold;font-size:16px;">
        Zaloguj się
      </a>
    </div>
    <p style="font-size:14px;color:#666;">Jeśli przycisk nie działa, skopiuj ten link do przeglądarki:<br/>
      <a href="{{link_logowania}}" style="color:#B8912A;">{{link_logowania}}</a>
    </p>
    <p style="margin-top:24px;">Pozdrawiamy,<br/><strong>Zespół Pure Life Center</strong></p>
  </div>',
  updated_at = now()
WHERE internal_name = 'admin_approval';
