-- Create admin profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create CMS sections table
CREATE TABLE public.cms_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  position INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for CMS sections
ALTER TABLE public.cms_sections ENABLE ROW LEVEL SECURITY;

-- Create CMS items table (buttons, links, content within sections)
CREATE TABLE public.cms_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES public.cms_sections(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'button', 'link', 'text', 'image'
  title TEXT,
  description TEXT,
  url TEXT,
  icon TEXT,
  position INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for CMS items
ALTER TABLE public.cms_items ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check admin role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  );
$$;

-- Create policies for CMS sections
CREATE POLICY "Anyone can view active CMS sections" 
ON public.cms_sections 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Only admins can manage CMS sections" 
ON public.cms_sections 
FOR ALL 
USING (public.is_admin());

-- Create policies for CMS items
CREATE POLICY "Anyone can view active CMS items" 
ON public.cms_items 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Only admins can manage CMS items" 
ON public.cms_items 
FOR ALL 
USING (public.is_admin());

-- Create function to handle new user profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, role)
  VALUES (NEW.id, NEW.email, 'user');
  RETURN NEW;
END;
$$;

-- Create trigger for new user profiles
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cms_sections_updated_at
  BEFORE UPDATE ON public.cms_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cms_items_updated_at
  BEFORE UPDATE ON public.cms_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial CMS content based on current sections
INSERT INTO public.cms_sections (title, position) VALUES
('Strefa współpracy', 1),
('Klient', 2),
('Terminarz', 3),
('Social Media', 4),
('Materiały - social media', 5),
('Aplikacje', 6),
('Materiały na zamówienie', 7),
('EQ GO', 8),
('Lista zadań', 9),
('POMOC', 10);

-- Get section IDs for inserting items
WITH section_ids AS (
  SELECT id, title FROM public.cms_sections
)
INSERT INTO public.cms_items (section_id, type, title, description, url, position)
SELECT 
  s.id,
  'button',
  item.title,
  item.description,
  item.url,
  item.position
FROM section_ids s
CROSS JOIN (
  SELECT 1 as position, 'Partner' as title, 'Przejdź do sekcji Partner' as description, '#partner' as url
  WHERE s.title = 'Strefa współpracy'
  UNION ALL
  SELECT 2, 'Specjalista', 'Przejdź do sekcji Specjalista', '#specjalista'
  WHERE s.title = 'Strefa współpracy'
  UNION ALL
  SELECT 1, 'Karta Klienta', 'Zarządzaj kartą klienta', '#karta-klienta'
  WHERE s.title = 'Klient'
  UNION ALL
  SELECT 2, 'Baza klientów', 'Dostęp do bazy klientów', '#baza-klientów'
  WHERE s.title = 'Klient'
) item;