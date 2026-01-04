-- Dodaj politykę pozwalającą użytkownikom tworzyć własne certyfikaty
CREATE POLICY "Users can insert their own certificates"
ON public.certificates
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Dodaj politykę pozwalającą użytkownikom aktualizować własne certyfikaty (na wypadek aktualizacji)
CREATE POLICY "Users can update their own certificates"
ON public.certificates
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);