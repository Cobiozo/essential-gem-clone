-- =====================================================
-- MODUŁ: Webinary i spotkania
-- Wersja: 1.0
-- =====================================================

-- 1. Tabela uprawnień liderów (musi być pierwsza - referencja w events)
CREATE TABLE public.leader_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  can_host_private_meetings boolean DEFAULT false,
  zoom_link text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  activated_by uuid REFERENCES auth.users(id),
  activated_at timestamptz
);

-- 2. Tabela tematów spotkań liderów (musi być przed events - referencja)
CREATE TABLE public.leader_meeting_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  leader_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  duration_minutes integer DEFAULT 30,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_leader_topics_user ON public.leader_meeting_topics(leader_user_id);

-- 3. Tabela główna wydarzeń
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  event_type text NOT NULL DEFAULT 'webinar',
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  timezone text DEFAULT 'Europe/Warsaw',
  zoom_link text,
  location text,
  visible_to_everyone boolean DEFAULT false,
  visible_to_partners boolean DEFAULT false,
  visible_to_specjalista boolean DEFAULT false,
  visible_to_clients boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  host_user_id uuid REFERENCES auth.users(id),
  image_url text,
  buttons jsonb DEFAULT '[]',
  max_participants integer,
  is_active boolean DEFAULT true,
  requires_registration boolean DEFAULT true,
  meeting_topic_id uuid REFERENCES public.leader_meeting_topics(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_events_start_time ON public.events(start_time);
CREATE INDEX idx_events_type ON public.events(event_type);
CREATE INDEX idx_events_host ON public.events(host_user_id);

-- 4. Tabela rejestracji na wydarzenia
CREATE TABLE public.event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'registered',
  registered_at timestamptz DEFAULT now(),
  cancelled_at timestamptz,
  reminder_sent boolean DEFAULT false,
  UNIQUE(event_id, user_id)
);

CREATE INDEX idx_event_registrations_event ON public.event_registrations(event_id);
CREATE INDEX idx_event_registrations_user ON public.event_registrations(user_id);

-- 5. Tabela dostępności liderów
CREATE TABLE public.leader_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  leader_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  day_of_week integer,
  specific_date date,
  start_time time NOT NULL,
  end_time time NOT NULL,
  slot_duration_minutes integer DEFAULT 30,
  max_bookings_per_slot integer DEFAULT 1,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_leader_availability_user ON public.leader_availability(leader_user_id);

-- 6. Tabela ustawień modułu
CREATE TABLE public.events_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled boolean DEFAULT true,
  reminder_hours_before integer DEFAULT 24,
  send_email_reminders boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

INSERT INTO public.events_settings (is_enabled) VALUES (true);

-- =====================================================
-- FUNKCJE POMOCNICZE
-- =====================================================

-- Funkcja sprawdzająca czy użytkownik jest aktywnym liderem
CREATE OR REPLACE FUNCTION public.is_active_leader(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.leader_permissions
    WHERE user_id = _user_id
    AND can_host_private_meetings = true
  )
$$;

-- Funkcja sprawdzająca czy aktualny użytkownik jest aktywnym liderem
CREATE OR REPLACE FUNCTION public.is_current_user_leader()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_active_leader(auth.uid())
$$;

-- Trigger do aktualizacji updated_at
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leader_permissions_updated_at
  BEFORE UPDATE ON public.leader_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_events_settings_updated_at
  BEFORE UPDATE ON public.events_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- RLS dla leader_permissions
ALTER TABLE public.leader_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_manage_leader_permissions" ON public.leader_permissions
  FOR ALL USING (public.is_admin());

CREATE POLICY "users_view_own_permissions" ON public.leader_permissions
  FOR SELECT USING (user_id = auth.uid());

-- RLS dla leader_meeting_topics
ALTER TABLE public.leader_meeting_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leaders_manage_own_topics" ON public.leader_meeting_topics
  FOR ALL USING (leader_user_id = auth.uid() AND public.is_current_user_leader());

CREATE POLICY "users_view_active_topics" ON public.leader_meeting_topics
  FOR SELECT USING (is_active = true);

CREATE POLICY "admins_manage_all_topics" ON public.leader_meeting_topics
  FOR ALL USING (public.is_admin());

-- RLS dla events
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_view_events_by_role" ON public.events
  FOR SELECT USING (
    is_active = true AND (
      public.is_admin() OR
      visible_to_everyone = true OR
      (visible_to_partners = true AND public.get_current_user_role() = 'partner') OR
      (visible_to_specjalista = true AND public.get_current_user_role() = 'specjalista') OR
      (visible_to_clients = true AND public.get_current_user_role() IN ('client', 'user')) OR
      (event_type = 'meeting_private' AND (
        created_by = auth.uid() OR 
        host_user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.event_registrations 
                WHERE event_id = events.id AND user_id = auth.uid())
      ))
    )
  );

CREATE POLICY "admins_manage_events" ON public.events
  FOR ALL USING (public.is_admin());

CREATE POLICY "leaders_manage_own_private_events" ON public.events
  FOR ALL USING (
    event_type = 'meeting_private' AND
    host_user_id = auth.uid() AND
    public.is_current_user_leader()
  );

-- RLS dla event_registrations
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_registrations" ON public.event_registrations
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "admins_view_all_registrations" ON public.event_registrations
  FOR SELECT USING (public.is_admin());

CREATE POLICY "hosts_view_event_registrations" ON public.event_registrations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.events WHERE id = event_id AND host_user_id = auth.uid())
  );

CREATE POLICY "users_insert_registrations" ON public.event_registrations
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- RLS dla leader_availability
ALTER TABLE public.leader_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leaders_manage_own_availability" ON public.leader_availability
  FOR ALL USING (leader_user_id = auth.uid() AND public.is_current_user_leader());

CREATE POLICY "users_view_active_availability" ON public.leader_availability
  FOR SELECT USING (is_active = true);

CREATE POLICY "admins_manage_all_availability" ON public.leader_availability
  FOR ALL USING (public.is_admin());

-- RLS dla events_settings
ALTER TABLE public.events_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_manage_events_settings" ON public.events_settings
  FOR ALL USING (public.is_admin());

CREATE POLICY "users_view_events_settings" ON public.events_settings
  FOR SELECT USING (true);

-- =====================================================
-- TYPY POWIADOMIEŃ
-- =====================================================

INSERT INTO public.notification_event_types (event_key, name, description, source_module, icon_name, color, is_active, position, send_email)
VALUES 
  ('event_new', 'Nowe wydarzenie', 'Powiadomienie o nowym wydarzeniu', 'events', 'Calendar', '#3B82F6', true, 20, true),
  ('event_reminder', 'Przypomnienie o wydarzeniu', 'Przypomnienie przed wydarzeniem', 'events', 'Bell', '#F59E0B', true, 21, true),
  ('event_cancelled', 'Wydarzenie odwołane', 'Powiadomienie o odwołaniu wydarzenia', 'events', 'CalendarX', '#EF4444', true, 22, true),
  ('meeting_booked', 'Nowa rezerwacja spotkania', 'Ktoś zarezerwował spotkanie z Tobą', 'events', 'UserPlus', '#10B981', true, 23, true),
  ('meeting_confirmed', 'Spotkanie potwierdzone', 'Twoja rezerwacja spotkania została potwierdzona', 'events', 'CheckCircle', '#10B981', true, 24, true)
ON CONFLICT (event_key) DO NOTHING;

-- =====================================================
-- TŁUMACZENIA
-- =====================================================

INSERT INTO public.i18n_translations (language_code, namespace, key, value)
VALUES 
  -- Polski
  ('pl', 'events', 'title', 'Webinary i spotkania'),
  ('pl', 'events', 'webinar', 'Webinar'),
  ('pl', 'events', 'meetingPublic', 'Spotkanie ogólne'),
  ('pl', 'events', 'meetingPrivate', 'Spotkanie indywidualne'),
  ('pl', 'events', 'registerButton', 'Zapisz się'),
  ('pl', 'events', 'registered', 'Zapisano'),
  ('pl', 'events', 'cancelled', 'Anulowano'),
  ('pl', 'events', 'noUpcoming', 'Brak nadchodzących wydarzeń'),
  ('pl', 'events', 'bookMeeting', 'Umów spotkanie z liderem'),
  ('pl', 'events', 'selectLeader', 'Wybierz lidera'),
  ('pl', 'events', 'selectTopic', 'Wybierz temat spotkania'),
  ('pl', 'events', 'selectDate', 'Wybierz datę'),
  ('pl', 'events', 'selectTime', 'Wybierz godzinę'),
  ('pl', 'events', 'confirmBooking', 'Potwierdź rezerwację'),
  ('pl', 'events', 'bookingSummary', 'Podsumowanie rezerwacji'),
  ('pl', 'events', 'legend', 'Legenda'),
  ('pl', 'events', 'legendWebinar', 'Webinar'),
  ('pl', 'events', 'legendMeeting', 'Spotkanie ogólne'),
  ('pl', 'events', 'legendPrivate', 'Spotkanie prywatne'),
  ('pl', 'events', 'myMeetings', 'Moje spotkania'),
  ('pl', 'events', 'zoomLink', 'Link do spotkania'),
  ('pl', 'events', 'cancel', 'Anuluj rezerwację'),
  ('pl', 'events', 'topics', 'Tematy spotkań'),
  ('pl', 'events', 'addTopic', 'Dodaj temat'),
  ('pl', 'events', 'topicTitle', 'Tytuł tematu'),
  ('pl', 'events', 'topicDescription', 'Opis tematu'),
  ('pl', 'events', 'topicDuration', 'Czas trwania (min)'),
  ('pl', 'events', 'availability', 'Dostępność'),
  ('pl', 'events', 'addSlot', 'Dodaj slot czasowy'),
  ('pl', 'events', 'dayOfWeek', 'Dzień tygodnia'),
  ('pl', 'events', 'timeRange', 'Zakres godzin'),
  ('pl', 'events', 'noAvailableSlots', 'Brak dostępnych terminów'),
  ('pl', 'events', 'addEvent', 'Dodaj wydarzenie'),
  ('pl', 'events', 'editEvent', 'Edytuj wydarzenie'),
  ('pl', 'events', 'deleteEvent', 'Usuń wydarzenie'),
  ('pl', 'events', 'eventTitle', 'Tytuł wydarzenia'),
  ('pl', 'events', 'eventDescription', 'Opis wydarzenia'),
  ('pl', 'events', 'eventType', 'Typ wydarzenia'),
  ('pl', 'events', 'startTime', 'Data i godzina rozpoczęcia'),
  ('pl', 'events', 'endTime', 'Data i godzina zakończenia'),
  ('pl', 'events', 'maxParticipants', 'Maksymalna liczba uczestników'),
  ('pl', 'events', 'visibility', 'Widoczność'),
  ('pl', 'events', 'participants', 'Uczestnicy'),
  ('pl', 'events', 'noParticipants', 'Brak uczestników'),
  ('pl', 'events', 'leaders', 'Zarządzanie liderami'),
  ('pl', 'events', 'enableLeader', 'Włącz dostęp do spotkań'),
  ('pl', 'events', 'leaderEnabled', 'Lider aktywny'),
  ('pl', 'events', 'leaderDisabled', 'Lider nieaktywny'),
  ('pl', 'events', 'myZoomLink', 'Mój link Zoom'),
  ('pl', 'events', 'upcomingMeetings', 'Nadchodzące spotkania'),
  ('pl', 'events', 'pastMeetings', 'Przeszłe spotkania'),
  ('pl', 'events', 'bookingSuccess', 'Spotkanie zostało zarezerwowane'),
  ('pl', 'events', 'registrationSuccess', 'Zapisano na wydarzenie'),
  ('pl', 'events', 'cancellationSuccess', 'Rezerwacja anulowana'),
  ('pl', 'events', 'monday', 'Poniedziałek'),
  ('pl', 'events', 'tuesday', 'Wtorek'),
  ('pl', 'events', 'wednesday', 'Środa'),
  ('pl', 'events', 'thursday', 'Czwartek'),
  ('pl', 'events', 'friday', 'Piątek'),
  ('pl', 'events', 'saturday', 'Sobota'),
  ('pl', 'events', 'sunday', 'Niedziela'),
  -- English
  ('en', 'events', 'title', 'Webinars and meetings'),
  ('en', 'events', 'webinar', 'Webinar'),
  ('en', 'events', 'meetingPublic', 'Public meeting'),
  ('en', 'events', 'meetingPrivate', 'Private meeting'),
  ('en', 'events', 'registerButton', 'Register'),
  ('en', 'events', 'registered', 'Registered'),
  ('en', 'events', 'cancelled', 'Cancelled'),
  ('en', 'events', 'noUpcoming', 'No upcoming events'),
  ('en', 'events', 'bookMeeting', 'Book a meeting with a leader'),
  ('en', 'events', 'selectLeader', 'Select leader'),
  ('en', 'events', 'selectTopic', 'Select meeting topic'),
  ('en', 'events', 'selectDate', 'Select date'),
  ('en', 'events', 'selectTime', 'Select time'),
  ('en', 'events', 'confirmBooking', 'Confirm booking'),
  ('en', 'events', 'bookingSummary', 'Booking summary'),
  ('en', 'events', 'legend', 'Legend'),
  ('en', 'events', 'legendWebinar', 'Webinar'),
  ('en', 'events', 'legendMeeting', 'Public meeting'),
  ('en', 'events', 'legendPrivate', 'Private meeting'),
  ('en', 'events', 'myMeetings', 'My meetings'),
  ('en', 'events', 'zoomLink', 'Meeting link'),
  ('en', 'events', 'cancel', 'Cancel reservation'),
  ('en', 'events', 'topics', 'Meeting topics'),
  ('en', 'events', 'addTopic', 'Add topic'),
  ('en', 'events', 'topicTitle', 'Topic title'),
  ('en', 'events', 'topicDescription', 'Topic description'),
  ('en', 'events', 'topicDuration', 'Duration (min)'),
  ('en', 'events', 'availability', 'Availability'),
  ('en', 'events', 'addSlot', 'Add time slot'),
  ('en', 'events', 'dayOfWeek', 'Day of week'),
  ('en', 'events', 'timeRange', 'Time range'),
  ('en', 'events', 'noAvailableSlots', 'No available slots'),
  ('en', 'events', 'addEvent', 'Add event'),
  ('en', 'events', 'editEvent', 'Edit event'),
  ('en', 'events', 'deleteEvent', 'Delete event'),
  ('en', 'events', 'eventTitle', 'Event title'),
  ('en', 'events', 'eventDescription', 'Event description'),
  ('en', 'events', 'eventType', 'Event type'),
  ('en', 'events', 'startTime', 'Start date and time'),
  ('en', 'events', 'endTime', 'End date and time'),
  ('en', 'events', 'maxParticipants', 'Maximum participants'),
  ('en', 'events', 'visibility', 'Visibility'),
  ('en', 'events', 'participants', 'Participants'),
  ('en', 'events', 'noParticipants', 'No participants'),
  ('en', 'events', 'leaders', 'Leader management'),
  ('en', 'events', 'enableLeader', 'Enable meeting access'),
  ('en', 'events', 'leaderEnabled', 'Leader active'),
  ('en', 'events', 'leaderDisabled', 'Leader inactive'),
  ('en', 'events', 'myZoomLink', 'My Zoom link'),
  ('en', 'events', 'upcomingMeetings', 'Upcoming meetings'),
  ('en', 'events', 'pastMeetings', 'Past meetings'),
  ('en', 'events', 'bookingSuccess', 'Meeting has been booked'),
  ('en', 'events', 'registrationSuccess', 'Registered for event'),
  ('en', 'events', 'cancellationSuccess', 'Reservation cancelled'),
  ('en', 'events', 'monday', 'Monday'),
  ('en', 'events', 'tuesday', 'Tuesday'),
  ('en', 'events', 'wednesday', 'Wednesday'),
  ('en', 'events', 'thursday', 'Thursday'),
  ('en', 'events', 'friday', 'Friday'),
  ('en', 'events', 'saturday', 'Saturday'),
  ('en', 'events', 'sunday', 'Sunday')
ON CONFLICT (language_code, namespace, key) DO NOTHING;