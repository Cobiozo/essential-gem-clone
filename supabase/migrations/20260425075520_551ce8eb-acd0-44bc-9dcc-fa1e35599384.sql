-- Naprawa stanu rejestracji Jana Testującego po naprawie konfiguracji verify_jwt
-- Submission ID: 64aed010-5584-4601-8ef3-c8fde6f0cc74

-- 1) Oznacz email jako potwierdzony
UPDATE public.event_form_submissions
SET email_confirmed_at = now()
WHERE id = '64aed010-5584-4601-8ef3-c8fde6f0cc74'
  AND email_confirmed_at IS NULL;

-- 2) Powiadom adminów
INSERT INTO public.user_notifications (user_id, notification_type, source_module, title, message, link, metadata)
SELECT ur.user_id,
       'event_form_confirmed',
       'paid_events',
       'Gość potwierdził e-mail rejestracji',
       'Jan Testujący (byk1023@wp.pl) potwierdził rejestrację (uzupełnione ręcznie po naprawie błędu konfiguracji verify_jwt).',
       '/admin?tab=paid-events',
       jsonb_build_object('submission_id','64aed010-5584-4601-8ef3-c8fde6f0cc74','email','byk1023@wp.pl')
FROM public.user_roles ur
WHERE ur.role = 'admin';

-- 3) Powiadom partnera zapraszającego (Sebastian Snopek), jeśli jest powiązany
INSERT INTO public.user_notifications (user_id, notification_type, source_module, title, message, link, metadata)
SELECT s.partner_user_id,
       'event_form_confirmed',
       'paid_events',
       'Twój gość potwierdził rejestrację',
       'Jan Testujący (byk1023@wp.pl) potwierdził rejestrację.',
       '/dashboard?tab=contacts',
       jsonb_build_object('submission_id', s.id, 'email', s.email)
FROM public.event_form_submissions s
WHERE s.id = '64aed010-5584-4601-8ef3-c8fde6f0cc74'
  AND s.partner_user_id IS NOT NULL;