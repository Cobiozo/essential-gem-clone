-- Tabela przechowująca tokeny Google OAuth użytkowników
CREATE TABLE public.user_google_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  calendar_id TEXT DEFAULT 'primary',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Tabela mapująca wydarzenia PureLife na wydarzenia Google Calendar
CREATE TABLE public.event_google_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  google_event_id TEXT NOT NULL,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Włącz RLS
ALTER TABLE public.user_google_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_google_sync ENABLE ROW LEVEL SECURITY;

-- Polityki RLS dla user_google_tokens
CREATE POLICY "Users can view their own google tokens"
  ON public.user_google_tokens FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own google tokens"
  ON public.user_google_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own google tokens"
  ON public.user_google_tokens FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own google tokens"
  ON public.user_google_tokens FOR DELETE USING (auth.uid() = user_id);

-- Polityki RLS dla event_google_sync
CREATE POLICY "Users can view their own sync records"
  ON public.event_google_sync FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sync records"
  ON public.event_google_sync FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sync records"
  ON public.event_google_sync FOR DELETE USING (auth.uid() = user_id);

-- Trigger do aktualizacji updated_at
CREATE TRIGGER update_user_google_tokens_updated_at
  BEFORE UPDATE ON public.user_google_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indeksy
CREATE INDEX idx_user_google_tokens_user_id ON public.user_google_tokens(user_id);
CREATE INDEX idx_event_google_sync_user_id ON public.event_google_sync(user_id);
CREATE INDEX idx_event_google_sync_event_id ON public.event_google_sync(event_id);