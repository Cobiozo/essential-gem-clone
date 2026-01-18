-- Create table for leader availability exceptions (date blocks)
CREATE TABLE public.leader_availability_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  leader_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exception_date date NOT NULL,
  reason text,
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(leader_user_id, exception_date)
);

-- Enable RLS
ALTER TABLE public.leader_availability_exceptions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view all exceptions"
  ON public.leader_availability_exceptions FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Leaders can insert own exceptions"
  ON public.leader_availability_exceptions FOR INSERT
  TO authenticated WITH CHECK (leader_user_id = auth.uid());

CREATE POLICY "Leaders can update own exceptions"
  ON public.leader_availability_exceptions FOR UPDATE
  TO authenticated USING (leader_user_id = auth.uid());

CREATE POLICY "Leaders can delete own exceptions"
  ON public.leader_availability_exceptions FOR DELETE
  TO authenticated USING (leader_user_id = auth.uid());