-- ============================================
-- PAID EVENTS MODULE - Database Schema
-- ============================================

-- 1. paid_events_settings - Global module settings (create first for references)
CREATE TABLE public.paid_events_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  visible_to_admin BOOLEAN NOT NULL DEFAULT true,
  visible_to_partner BOOLEAN NOT NULL DEFAULT false,
  visible_to_specjalista BOOLEAN NOT NULL DEFAULT false,
  visible_to_client BOOLEAN NOT NULL DEFAULT false,
  payu_merchant_id TEXT,
  payu_pos_id TEXT,
  payu_environment TEXT DEFAULT 'sandbox' CHECK (payu_environment IN ('sandbox', 'production')),
  default_currency TEXT DEFAULT 'PLN',
  company_name TEXT,
  company_nip TEXT,
  company_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default settings row
INSERT INTO public.paid_events_settings (is_enabled) VALUES (false);

-- 2. paid_events - Main events table
CREATE TABLE public.paid_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  short_description TEXT,
  banner_url TEXT,
  location TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  event_end_date TIMESTAMPTZ,
  is_online BOOLEAN DEFAULT false,
  stream_url TEXT,
  max_tickets INTEGER,
  tickets_sold INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  visible_to_everyone BOOLEAN DEFAULT true,
  visible_to_partners BOOLEAN DEFAULT false,
  visible_to_specjalista BOOLEAN DEFAULT false,
  visible_to_clients BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. paid_event_tickets - Ticket packages
CREATE TABLE public.paid_event_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.paid_events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price_pln INTEGER NOT NULL DEFAULT 0,
  quantity_available INTEGER,
  quantity_sold INTEGER DEFAULT 0,
  sale_start TIMESTAMPTZ,
  sale_end TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. paid_event_speakers - Speakers/presenters
CREATE TABLE public.paid_event_speakers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.paid_events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT,
  bio TEXT,
  photo_url TEXT,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. paid_event_schedule - Event schedule/agenda
CREATE TABLE public.paid_event_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.paid_events(id) ON DELETE CASCADE,
  time_slot TIME NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  speaker_id UUID REFERENCES public.paid_event_speakers(id) ON DELETE SET NULL,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. paid_event_orders - Orders/Tickets purchased
CREATE TABLE public.paid_event_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.paid_events(id) ON DELETE RESTRICT,
  ticket_id UUID NOT NULL REFERENCES public.paid_event_tickets(id) ON DELETE RESTRICT,
  user_id UUID REFERENCES auth.users(id),
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  quantity INTEGER DEFAULT 1,
  total_amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled', 'refunded')),
  payment_provider TEXT DEFAULT 'payu',
  payment_order_id TEXT,
  payment_transaction_id TEXT,
  ticket_code TEXT UNIQUE,
  ticket_generated_at TIMESTAMPTZ,
  ticket_sent_at TIMESTAMPTZ,
  checked_in BOOLEAN DEFAULT false,
  checked_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_paid_events_slug ON public.paid_events(slug);
CREATE INDEX idx_paid_events_event_date ON public.paid_events(event_date);
CREATE INDEX idx_paid_events_is_published ON public.paid_events(is_published);
CREATE INDEX idx_paid_event_tickets_event_id ON public.paid_event_tickets(event_id);
CREATE INDEX idx_paid_event_speakers_event_id ON public.paid_event_speakers(event_id);
CREATE INDEX idx_paid_event_schedule_event_id ON public.paid_event_schedule(event_id);
CREATE INDEX idx_paid_event_orders_event_id ON public.paid_event_orders(event_id);
CREATE INDEX idx_paid_event_orders_ticket_code ON public.paid_event_orders(ticket_code);
CREATE INDEX idx_paid_event_orders_status ON public.paid_event_orders(status);
CREATE INDEX idx_paid_event_orders_email ON public.paid_event_orders(email);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.paid_events_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paid_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paid_event_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paid_event_speakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paid_event_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paid_event_orders ENABLE ROW LEVEL SECURITY;

-- paid_events_settings policies (admin only for write, all authenticated for read)
CREATE POLICY "Anyone can read paid events settings"
ON public.paid_events_settings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage paid events settings"
ON public.paid_events_settings FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- paid_events policies
CREATE POLICY "Anyone can read published paid events"
ON public.paid_events FOR SELECT
USING (
  is_published = true 
  OR is_admin() 
  OR (auth.uid() IS NOT NULL AND created_by = auth.uid())
);

CREATE POLICY "Admins can manage paid events"
ON public.paid_events FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- paid_event_tickets policies
CREATE POLICY "Anyone can read active tickets for published events"
ON public.paid_event_tickets FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.paid_events 
    WHERE id = event_id AND (is_published = true OR is_admin())
  )
);

CREATE POLICY "Admins can manage paid event tickets"
ON public.paid_event_tickets FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- paid_event_speakers policies
CREATE POLICY "Anyone can read speakers for published events"
ON public.paid_event_speakers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.paid_events 
    WHERE id = event_id AND (is_published = true OR is_admin())
  )
);

CREATE POLICY "Admins can manage paid event speakers"
ON public.paid_event_speakers FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- paid_event_schedule policies
CREATE POLICY "Anyone can read schedule for published events"
ON public.paid_event_schedule FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.paid_events 
    WHERE id = event_id AND (is_published = true OR is_admin())
  )
);

CREATE POLICY "Admins can manage paid event schedule"
ON public.paid_event_schedule FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- paid_event_orders policies
CREATE POLICY "Users can read their own orders"
ON public.paid_event_orders FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR is_admin()
);

CREATE POLICY "Anyone can create orders"
ON public.paid_event_orders FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can manage all orders"
ON public.paid_event_orders FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Service role can update orders (for webhooks)
CREATE POLICY "Service role can update orders"
ON public.paid_event_orders FOR UPDATE
USING (true)
WITH CHECK (true);

-- ============================================
-- TRIGGERS FOR updated_at
-- ============================================

CREATE TRIGGER update_paid_events_settings_updated_at
BEFORE UPDATE ON public.paid_events_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_paid_events_updated_at
BEFORE UPDATE ON public.paid_events
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_paid_event_tickets_updated_at
BEFORE UPDATE ON public.paid_event_tickets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_paid_event_speakers_updated_at
BEFORE UPDATE ON public.paid_event_speakers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_paid_event_schedule_updated_at
BEFORE UPDATE ON public.paid_event_schedule
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_paid_event_orders_updated_at
BEFORE UPDATE ON public.paid_event_orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- STORAGE BUCKET FOR EVENT TICKETS
-- ============================================

INSERT INTO storage.buckets (id, name, public) 
VALUES ('event-tickets', 'event-tickets', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for event-tickets bucket
CREATE POLICY "Admins can manage event tickets storage"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'event-tickets' AND is_admin())
WITH CHECK (bucket_id = 'event-tickets' AND is_admin());

CREATE POLICY "Users can read their own tickets"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'event-tickets' 
  AND (
    is_admin() 
    OR EXISTS (
      SELECT 1 FROM public.paid_event_orders 
      WHERE (user_id = auth.uid() OR email = (SELECT email FROM auth.users WHERE id = auth.uid()))
      AND (storage.foldername(name))[2] = id::text
    )
  )
);