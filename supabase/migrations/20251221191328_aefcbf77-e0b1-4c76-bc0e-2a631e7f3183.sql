-- Event types configuration (admin manages)
CREATE TABLE public.notification_event_types (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_key text NOT NULL UNIQUE,
    name text NOT NULL,
    description text,
    source_module text NOT NULL,
    icon_name text DEFAULT 'Bell',
    color text DEFAULT '#3b82f6',
    is_active boolean DEFAULT true,
    position integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Role routing rules (who receives what)
CREATE TABLE public.notification_role_routes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type_id uuid REFERENCES public.notification_event_types(id) ON DELETE CASCADE,
    source_role text NOT NULL,
    target_role text NOT NULL,
    is_enabled boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(event_type_id, source_role, target_role)
);

-- Rate limits and cooldowns
CREATE TABLE public.notification_limits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type_id uuid REFERENCES public.notification_event_types(id) ON DELETE CASCADE,
    max_per_hour integer DEFAULT 10,
    max_per_day integer DEFAULT 50,
    cooldown_minutes integer DEFAULT 5,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(event_type_id)
);

-- Events log (raw events from modules)
CREATE TABLE public.notification_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type_id uuid REFERENCES public.notification_event_types(id) ON DELETE SET NULL,
    event_key text NOT NULL,
    sender_id uuid NOT NULL,
    sender_role text,
    payload jsonb DEFAULT '{}'::jsonb,
    related_entity_type text,
    related_entity_id uuid,
    processed boolean DEFAULT false,
    processed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

-- User notification preferences
CREATE TABLE public.user_notification_preferences (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    event_type_id uuid REFERENCES public.notification_event_types(id) ON DELETE CASCADE,
    is_enabled boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id, event_type_id)
);

-- Event delivery tracking (cooldown check)
CREATE TABLE public.notification_delivery_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid REFERENCES public.notification_events(id) ON DELETE CASCADE,
    user_id uuid NOT NULL,
    event_type_id uuid REFERENCES public.notification_event_types(id) ON DELETE SET NULL,
    delivered_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_role_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_delivery_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification_event_types
CREATE POLICY "Admins can manage event types" ON public.notification_event_types
    FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Everyone can view active event types" ON public.notification_event_types
    FOR SELECT USING (is_active = true);

-- RLS Policies for notification_role_routes
CREATE POLICY "Admins can manage role routes" ON public.notification_role_routes
    FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Everyone can view enabled routes" ON public.notification_role_routes
    FOR SELECT USING (is_enabled = true);

-- RLS Policies for notification_limits
CREATE POLICY "Admins can manage limits" ON public.notification_limits
    FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Everyone can view active limits" ON public.notification_limits
    FOR SELECT USING (is_active = true);

-- RLS Policies for notification_events
CREATE POLICY "Admins can view all events" ON public.notification_events
    FOR SELECT USING (is_admin());

CREATE POLICY "Users can insert events" ON public.notification_events
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view own events" ON public.notification_events
    FOR SELECT USING (auth.uid() = sender_id);

-- RLS Policies for user_notification_preferences
CREATE POLICY "Users can manage own preferences" ON public.user_notification_preferences
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all preferences" ON public.user_notification_preferences
    FOR SELECT USING (is_admin());

-- RLS Policies for notification_delivery_log
CREATE POLICY "Admins can view all delivery logs" ON public.notification_delivery_log
    FOR SELECT USING (is_admin());

CREATE POLICY "Users can view own delivery logs" ON public.notification_delivery_log
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert delivery logs" ON public.notification_delivery_log
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Insert default event types
INSERT INTO public.notification_event_types (event_key, name, description, source_module, icon_name, color, position) VALUES
('contact_added', 'Nowy kontakt', 'Dodano nowy kontakt do listy', 'team_contacts', 'UserPlus', '#10b981', 1),
('contact_reminder', 'Przypomnienie o kontakcie', 'Przypomnienie o zaplanowanym kontakcie', 'team_contacts', 'Clock', '#f59e0b', 2),
('reflink_shared', 'Udostępniono reflink', 'Ktoś udostępnił reflink', 'reflinks', 'Share2', '#8b5cf6', 3),
('resource_new', 'Nowy materiał', 'Dodano nowy materiał do bazy wiedzy', 'knowledge', 'FileText', '#3b82f6', 4),
('resource_updated', 'Zaktualizowano materiał', 'Zaktualizowano materiał w bazie wiedzy', 'knowledge', 'RefreshCw', '#06b6d4', 5),
('banner_new', 'Nowe ogłoszenie', 'Opublikowano nowy baner informacyjny', 'banners', 'Megaphone', '#ef4444', 6),
('training_assigned', 'Przypisano szkolenie', 'Przypisano nowe szkolenie do ukończenia', 'training', 'GraduationCap', '#ec4899', 7),
('training_completed', 'Ukończono szkolenie', 'Użytkownik ukończył szkolenie', 'training', 'Award', '#22c55e', 8);

-- Insert default limits for each event type
INSERT INTO public.notification_limits (event_type_id, max_per_hour, max_per_day, cooldown_minutes)
SELECT id, 10, 50, 5 FROM public.notification_event_types;

-- Create indexes for performance
CREATE INDEX idx_notification_events_sender ON public.notification_events(sender_id);
CREATE INDEX idx_notification_events_created ON public.notification_events(created_at DESC);
CREATE INDEX idx_notification_events_type ON public.notification_events(event_type_id);
CREATE INDEX idx_notification_delivery_user ON public.notification_delivery_log(user_id);
CREATE INDEX idx_notification_delivery_time ON public.notification_delivery_log(delivered_at DESC);
CREATE INDEX idx_user_notifications_unread ON public.user_notifications(user_id, is_read) WHERE is_read = false;