CREATE TABLE public.omega_test_reminder_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES public.omega_tests(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.omega_test_clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('25d','120d')),
  channel text NOT NULL CHECK (channel IN ('in_app','email_partner','email_client')),
  recipient text,
  status text NOT NULL CHECK (status IN ('sent','failed','skipped')),
  error text,
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_otrl_test ON public.omega_test_reminder_log(test_id);
CREATE INDEX idx_otrl_client ON public.omega_test_reminder_log(client_id);
CREATE INDEX idx_otrl_user_sent ON public.omega_test_reminder_log(user_id, sent_at DESC);

ALTER TABLE public.omega_test_reminder_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can read reminder log"
ON public.omega_test_reminder_log
FOR SELECT
USING (auth.uid() = user_id);
