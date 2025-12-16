-- Add UPDATE policy for user_cookie_consents to allow UPSERT
CREATE POLICY "Anyone can update cookie consents" 
  ON public.user_cookie_consents 
  FOR UPDATE 
  USING (true) 
  WITH CHECK (true);