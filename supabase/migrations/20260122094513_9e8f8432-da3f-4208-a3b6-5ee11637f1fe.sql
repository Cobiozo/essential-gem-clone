-- Pozwól twórcy spotkania indywidualnego zarejestrować hosta
-- To jest bezpieczne bo:
-- 1. Tylko twórca eventu (created_by = auth.uid()) może dodać tę rejestrację
-- 2. Może dodać TYLKO hosta tego konkretnego eventu (host_user_id = user_id)
-- 3. Ograniczone tylko do spotkań indywidualnych (tripartite_meeting, partner_consultation)

CREATE POLICY "creator_can_register_host"
ON public.event_registrations
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id
      AND e.created_by = auth.uid()
      AND e.host_user_id = event_registrations.user_id
      AND e.event_type IN ('tripartite_meeting', 'partner_consultation')
  )
);