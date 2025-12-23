-- Dodanie unikalnego indeksu na eq_id (ignoruje NULL wartości)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_eq_id_unique 
ON public.profiles(eq_id) WHERE eq_id IS NOT NULL;

-- Dodanie unikalnego indeksu na email
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique 
ON public.profiles(email);

-- Funkcja RPC do sprawdzania czy EQ ID już istnieje
CREATE OR REPLACE FUNCTION public.eq_id_exists(eq_id_param TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE eq_id = eq_id_param
  );
$$;