
-- paid_event_orders.user_id: CASCADE -> SET NULL
ALTER TABLE public.paid_event_orders DROP CONSTRAINT IF EXISTS paid_event_orders_user_id_fkey;
ALTER TABLE public.paid_event_orders
  ADD CONSTRAINT paid_event_orders_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- event_registrations.user_id: CASCADE -> SET NULL (preserve history)
ALTER TABLE public.event_registrations ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.event_registrations DROP CONSTRAINT IF EXISTS event_registrations_user_id_fkey;
ALTER TABLE public.event_registrations
  ADD CONSTRAINT event_registrations_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- guest_event_registrations.invited_by_user_id: NO ACTION -> SET NULL
ALTER TABLE public.guest_event_registrations DROP CONSTRAINT IF EXISTS guest_event_registrations_invited_by_user_id_fkey;
ALTER TABLE public.guest_event_registrations
  ADD CONSTRAINT guest_event_registrations_invited_by_user_id_fkey
  FOREIGN KEY (invited_by_user_id) REFERENCES public.profiles(user_id) ON DELETE SET NULL;

-- user_reflinks.creator_user_id: CASCADE -> SET NULL
ALTER TABLE public.user_reflinks ALTER COLUMN creator_user_id DROP NOT NULL;
ALTER TABLE public.user_reflinks DROP CONSTRAINT IF EXISTS user_reflinks_creator_user_id_fkey;
ALTER TABLE public.user_reflinks
  ADD CONSTRAINT user_reflinks_creator_user_id_fkey
  FOREIGN KEY (creator_user_id) REFERENCES public.profiles(user_id) ON DELETE SET NULL;
