
ALTER TABLE public.notification_event_types
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS is_mandatory boolean NOT NULL DEFAULT false;

-- Przypisz kategorie istniejącym typom
UPDATE public.notification_event_types SET category = 'account' WHERE event_key IN ('first_login','account_approved','user_registration');
UPDATE public.notification_event_types SET category = 'security', is_mandatory = true WHERE event_key IN ('password_reset','password_changed','password_reset_admin');
UPDATE public.notification_event_types SET category = 'events' WHERE event_key IN ('event_new','event_reminder','event_cancelled');
UPDATE public.notification_event_types SET category = 'meetings' WHERE event_key IN ('meeting_booked','meeting_confirmed');
UPDATE public.notification_event_types SET category = 'knowledge' WHERE event_key IN ('resource_new','resource_updated');
UPDATE public.notification_event_types SET category = 'news' WHERE event_key = 'banner_new';
UPDATE public.notification_event_types SET category = 'team' WHERE event_key IN ('contact_added','contact_reminder','reflink_shared');
UPDATE public.notification_event_types SET category = 'training' WHERE event_key IN ('training_assigned','training_completed','training_new_lessons');
UPDATE public.notification_event_types SET category = 'messaging' WHERE event_key = 'specialist_message';

-- Wstaw brakujące typy
INSERT INTO public.notification_event_types (event_key, name, description, source_module, icon_name, color, is_active, position, send_email, category, is_mandatory) VALUES
  ('webinar_confirmation','Potwierdzenie rejestracji na webinar','Wysyłane po zapisaniu się na webinar','events','Mail','#3b82f6',true,100,true,'events',false),
  ('webinar_reminder_2h','Przypomnienie 2h przed webinarem','Link do webinaru 2 godziny przed startem','events','Clock','#3b82f6',true,101,true,'events',false),
  ('webinar_reminder_1h','Przypomnienie 1h przed webinarem','Link do webinaru 1 godzinę przed startem','events','Clock','#3b82f6',true,102,true,'events',false),
  ('webinar_reminder_15min','Przypomnienie 15 min przed webinarem','Ostatnie przypomnienie z linkiem','events','Clock','#f59e0b',true,103,true,'events',false),
  ('webinar_join_now','Pilny link „dołącz teraz"','Wysyłany przy rejestracji krócej niż 15 min przed startem','events','Zap','#ef4444',true,104,true,'events',false),
  ('individual_meeting_reminder','Przypomnienie o spotkaniu indywidualnym','Wieloetapowe przypomnienia (24h, 2h, 15min)','meetings','Bell','#8b5cf6',true,110,true,'meetings',false),
  ('individual_meeting_cancelled','Spotkanie indywidualne odwołane','Informacja o odwołaniu spotkania','meetings','XCircle','#ef4444',true,111,true,'meetings',false),
  ('individual_meeting_rescheduled','Zmiana terminu spotkania','Nowa data spotkania indywidualnego','meetings','CalendarClock','#f59e0b',true,112,true,'meetings',false),
  ('event_order_confirmation','Potwierdzenie zamówienia biletu','Potwierdzenie rejestracji na event płatny','events','Ticket','#10b981',true,120,true,'events',false),
  ('event_payment_received','Potwierdzenie płatności','Wpłata za event została zaksięgowana','events','CreditCard','#10b981',true,121,true,'events',false),
  ('event_ticket_ready','Bilet gotowy do pobrania','Twój bilet jest dostępny','events','Ticket','#10b981',true,122,true,'events',false),
  ('event_form_confirmation','Potwierdzenie zgłoszenia w formularzu','Zgłoszenie z formularza rejestracyjnego','events','FileCheck','#3b82f6',true,123,true,'events',false),
  ('event_form_cancellation','Anulowanie zgłoszenia','Rezygnacja z eventu','events','XCircle','#6b7280',true,124,true,'events',false),
  ('welcome_email','Powitanie po aktywacji konta','Wiadomość powitalna','account','PartyPopper','#10b981',true,10,true,'account',false),
  ('mfa_code','Kod weryfikacyjny MFA','Jednorazowy kod dwuskładnikowy','security','Shield','#ef4444',true,20,true,'security',true),
  ('email_changed','Zmiana adresu email','Potwierdzenie zmiany adresu email','security','Mail','#f59e0b',true,21,true,'security',true),
  ('account_blocked','Konto zablokowane','Powiadomienie o blokadzie konta','security','Lock','#ef4444',true,22,true,'security',true),
  ('inactivity_warning','Ostrzeżenie o nieaktywności','14 lub 29 dni bez logowania','account','AlertTriangle','#f59e0b',true,30,true,'account',false),
  ('inactivity_final_warning','Finalne ostrzeżenie przed blokadą','30 dni bez logowania','account','AlertOctagon','#ef4444',true,31,true,'account',false),
  ('bw_otp_activated','Twój kod BW został aktywowany','Ktoś użył Twojego kodu OTP z Bazy Wiedzy','knowledge','KeyRound','#8b5cf6',true,140,true,'knowledge',false),
  ('bw_material_watched','Odbiorca ukończył materiał BW','Ktoś obejrzał do końca udostępniony materiał','knowledge','CheckCircle','#10b981',true,141,true,'knowledge',false),
  ('news_hub_post_new','Nowy post w Centrum Aktualności','Nowy wpis widoczny dla Twojej roli','news','Newspaper','#3b82f6',true,150,true,'news',false),
  ('news_hub_comment_reply','Odpowiedź na Twój komentarz','Ktoś odpowiedział w komentarzach','news','MessageCircle','#3b82f6',true,151,true,'news',false),
  ('broadcast_message','Wiadomość broadcast','Wiadomość rozgłoszeniowa od admina/lidera','messaging','Megaphone','#8b5cf6',true,160,true,'messaging',false),
  ('guardian_approval_needed','Wymagana akceptacja opiekuna','Nowa rejestracja czeka na Twoją decyzję','team','UserCheck','#f59e0b',true,170,true,'team',false),
  ('registration_approved_leader','Twoja rejestracja zatwierdzona','Lider/opiekun zatwierdził konto','team','ShieldCheck','#10b981',true,171,true,'team',false),
  ('downline_new_registration','Nowa rejestracja w downline','Ktoś zarejestrował się w Twojej strukturze','team','Users','#3b82f6',true,172,true,'team',false),
  ('support_ticket_reply','Odpowiedź na zgłoszenie','Odpowiedź w Twoim zgłoszeniu wsparcia','support','LifeBuoy','#3b82f6',true,180,true,'support',false),
  ('admin_activity_digest','Dzienny digest aktywności','Podsumowanie zdarzeń administracyjnych','admin','FileBarChart','#6b7280',true,190,true,'admin',false)
ON CONFLICT (event_key) DO UPDATE SET
  category = EXCLUDED.category,
  is_mandatory = EXCLUDED.is_mandatory,
  description = COALESCE(public.notification_event_types.description, EXCLUDED.description);
