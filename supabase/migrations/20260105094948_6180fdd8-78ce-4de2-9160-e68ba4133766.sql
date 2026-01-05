-- Usuń restrykcyjną politykę SELECT (tylko aktywne szablony)
DROP POLICY IF EXISTS "Everyone can view active templates" ON public.certificate_templates;

-- Nowa polityka - wszyscy zalogowani użytkownicy mogą widzieć wszystkie szablony
CREATE POLICY "Authenticated users can view all templates"
ON public.certificate_templates
FOR SELECT
TO authenticated
USING (true);

-- Ustaw wszystkie szablony jako aktywne (dla kompatybilności wstecznej)
UPDATE public.certificate_templates SET is_active = true WHERE is_active = false;