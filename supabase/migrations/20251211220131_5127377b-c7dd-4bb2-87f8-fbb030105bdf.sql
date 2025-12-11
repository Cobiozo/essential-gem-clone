-- Create table for medical chat history
CREATE TABLE public.medical_chat_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  query TEXT NOT NULL,
  response TEXT NOT NULL,
  results_count INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.medical_chat_history ENABLE ROW LEVEL SECURITY;

-- Users can only see their own chat history
CREATE POLICY "Users can view their own medical chat history"
ON public.medical_chat_history
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own chat history
CREATE POLICY "Users can insert their own medical chat history"
ON public.medical_chat_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own chat history
CREATE POLICY "Users can delete their own medical chat history"
ON public.medical_chat_history
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster user queries
CREATE INDEX idx_medical_chat_history_user_id ON public.medical_chat_history(user_id);
CREATE INDEX idx_medical_chat_history_created_at ON public.medical_chat_history(created_at DESC);