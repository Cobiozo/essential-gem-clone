-- Create training modules table
CREATE TABLE public.training_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  icon_name TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  visible_to_everyone BOOLEAN NOT NULL DEFAULT false,
  visible_to_clients BOOLEAN NOT NULL DEFAULT false,
  visible_to_partners BOOLEAN NOT NULL DEFAULT false,
  visible_to_specjalista BOOLEAN NOT NULL DEFAULT false,
  visible_to_anonymous BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create training lessons table
CREATE TABLE public.training_lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES public.training_modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  media_url TEXT,
  media_type TEXT, -- 'video', 'audio', 'document', 'text'
  media_alt_text TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  min_time_seconds INTEGER DEFAULT 0, -- minimum time required to spend on lesson
  is_required BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create training progress table
CREATE TABLE public.training_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lesson_id UUID NOT NULL REFERENCES public.training_lessons(id) ON DELETE CASCADE,
  time_spent_seconds INTEGER NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

-- Enable RLS on all training tables
ALTER TABLE public.training_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for training_modules
CREATE POLICY "Users can view modules based on role visibility"
ON public.training_modules FOR SELECT
USING (
  is_active = true AND (
    get_current_user_role() = 'admin' OR
    visible_to_everyone = true OR
    (visible_to_clients = true AND get_current_user_role() = ANY(ARRAY['client', 'user'])) OR
    (visible_to_partners = true AND get_current_user_role() = 'partner') OR
    (visible_to_specjalista = true AND get_current_user_role() = 'specjalista') OR
    (visible_to_anonymous = true AND auth.uid() IS NULL)
  )
);

CREATE POLICY "Anon can view modules"
ON public.training_modules FOR SELECT
USING (is_active = true AND (visible_to_everyone = true OR visible_to_anonymous = true));

CREATE POLICY "Admins can manage modules"
ON public.training_modules FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- RLS Policies for training_lessons
CREATE POLICY "Users can view lessons of accessible modules"
ON public.training_lessons FOR SELECT
USING (
  is_active = true AND EXISTS (
    SELECT 1 FROM public.training_modules tm 
    WHERE tm.id = module_id AND tm.is_active = true AND (
      get_current_user_role() = 'admin' OR
      tm.visible_to_everyone = true OR
      (tm.visible_to_clients = true AND get_current_user_role() = ANY(ARRAY['client', 'user'])) OR
      (tm.visible_to_partners = true AND get_current_user_role() = 'partner') OR
      (tm.visible_to_specjalista = true AND get_current_user_role() = 'specjalista') OR
      (tm.visible_to_anonymous = true AND auth.uid() IS NULL)
    )
  )
);

CREATE POLICY "Anon can view lessons of accessible modules"
ON public.training_lessons FOR SELECT
USING (
  is_active = true AND EXISTS (
    SELECT 1 FROM public.training_modules tm 
    WHERE tm.id = module_id AND tm.is_active = true AND 
    (tm.visible_to_everyone = true OR tm.visible_to_anonymous = true)
  )
);

CREATE POLICY "Admins can manage lessons"
ON public.training_lessons FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- RLS Policies for training_progress
CREATE POLICY "Users can view own progress"
ON public.training_progress FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
ON public.training_progress FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
ON public.training_progress FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all progress"
ON public.training_progress FOR SELECT
USING (is_admin());

-- Add triggers for updated_at
CREATE TRIGGER update_training_modules_updated_at
  BEFORE UPDATE ON public.training_modules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_training_lessons_updated_at
  BEFORE UPDATE ON public.training_lessons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_training_progress_updated_at
  BEFORE UPDATE ON public.training_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for training media
INSERT INTO storage.buckets (id, name, public) VALUES ('training-media', 'training-media', true);

-- Storage policies for training media
CREATE POLICY "Training media is publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'training-media');

CREATE POLICY "Admins can upload training media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'training-media' AND is_admin());

CREATE POLICY "Admins can update training media"
ON storage.objects FOR UPDATE
USING (bucket_id = 'training-media' AND is_admin());

CREATE POLICY "Admins can delete training media"
ON storage.objects FOR DELETE
USING (bucket_id = 'training-media' AND is_admin());