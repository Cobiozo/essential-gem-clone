-- 1. Tabela klientów partnera w bazie testów
CREATE TABLE public.omega_test_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_omega_test_clients_user ON public.omega_test_clients(user_id);

ALTER TABLE public.omega_test_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages own clients"
  ON public.omega_test_clients
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER trg_omega_test_clients_updated
  BEFORE UPDATE ON public.omega_test_clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Rozszerzenie omega_tests
ALTER TABLE public.omega_tests
  ADD COLUMN client_id uuid REFERENCES public.omega_test_clients(id) ON DELETE CASCADE,
  ADD COLUMN test_handed_date date,
  ADD COLUMN reminder_25d_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN reminder_120d_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN notify_partner_email boolean NOT NULL DEFAULT true,
  ADD COLUMN notify_client_email boolean NOT NULL DEFAULT false,
  ADD COLUMN reminder_25d_sent_at timestamptz,
  ADD COLUMN reminder_120d_sent_at timestamptz;

CREATE INDEX idx_omega_tests_client ON public.omega_tests(client_id);
CREATE INDEX idx_omega_tests_client_reminders
  ON public.omega_tests(test_date)
  WHERE client_id IS NOT NULL;