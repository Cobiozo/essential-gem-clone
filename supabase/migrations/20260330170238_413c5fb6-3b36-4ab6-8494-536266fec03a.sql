ALTER TABLE public.healthy_knowledge 
  ADD COLUMN IF NOT EXISTS allow_comments boolean DEFAULT false;

CREATE TABLE IF NOT EXISTS public.testimonial_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_id uuid REFERENCES public.healthy_knowledge(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  rating integer NOT NULL,
  comment text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(knowledge_id, user_id)
);

CREATE OR REPLACE FUNCTION public.validate_testimonial_comment_rating()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_validate_testimonial_comment_rating') THEN
    CREATE TRIGGER trg_validate_testimonial_comment_rating
      BEFORE INSERT OR UPDATE ON public.testimonial_comments
      FOR EACH ROW EXECUTE FUNCTION public.validate_testimonial_comment_rating();
  END IF;
END $$;

ALTER TABLE public.testimonial_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read comments" ON public.testimonial_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own" ON public.testimonial_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own" ON public.testimonial_comments FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admin can delete" ON public.testimonial_comments FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));