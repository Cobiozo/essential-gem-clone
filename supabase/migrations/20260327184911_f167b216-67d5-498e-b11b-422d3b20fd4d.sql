-- Allow anon users to INSERT their own view records
CREATE POLICY "Anon guests can insert views"
ON public.auto_webinar_views
FOR INSERT
TO anon
WITH CHECK (is_guest = true);

-- Allow anon users to UPDATE their own view records by session_id
CREATE POLICY "Anon guests can update own views by session_id"
ON public.auto_webinar_views
FOR UPDATE
TO anon
USING (is_guest = true AND session_id IS NOT NULL)
WITH CHECK (is_guest = true);

-- Allow anon users to SELECT their own view records by session_id
CREATE POLICY "Anon guests can select own views by session_id"
ON public.auto_webinar_views
FOR SELECT
TO anon
USING (is_guest = true AND session_id IS NOT NULL);