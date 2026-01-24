-- Tabela notatek do lekcji szkoleniowych
CREATE TABLE public.training_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  lesson_id UUID REFERENCES public.training_lessons(id) ON DELETE CASCADE NOT NULL,
  video_timestamp_seconds NUMERIC NOT NULL DEFAULT 0,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indeks dla szybkiego wyszukiwania notatek użytkownika dla lekcji
CREATE INDEX idx_training_notes_user_lesson ON public.training_notes(user_id, lesson_id);

-- Trigger do automatycznej aktualizacji updated_at
CREATE TRIGGER update_training_notes_updated_at
  BEFORE UPDATE ON public.training_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Włączenie RLS
ALTER TABLE public.training_notes ENABLE ROW LEVEL SECURITY;

-- Użytkownik może zarządzać tylko swoimi notatkami
CREATE POLICY "Users can manage own notes" 
  ON public.training_notes
  FOR ALL 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admin ma pełny dostęp
CREATE POLICY "Admins full access on training_notes" 
  ON public.training_notes
  FOR ALL 
  USING (public.is_admin())
  WITH CHECK (public.is_admin());