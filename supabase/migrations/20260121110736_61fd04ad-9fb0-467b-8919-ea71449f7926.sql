-- Tabela do przechowywania alertów systemowych dla admina
CREATE TABLE public.admin_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning',
  title TEXT NOT NULL,
  description TEXT,
  affected_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  affected_entity_type TEXT,
  affected_entity_id UUID,
  metadata JSONB DEFAULT '{}',
  suggested_action TEXT,
  is_resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  detected_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indeksy dla wydajności
CREATE INDEX idx_admin_alerts_unresolved ON public.admin_alerts(is_resolved, severity, detected_at DESC);
CREATE INDEX idx_admin_alerts_type ON public.admin_alerts(alert_type);
CREATE INDEX idx_admin_alerts_user ON public.admin_alerts(affected_user_id);

-- Unikalne ograniczenie dla unikania duplikatów alertów
CREATE UNIQUE INDEX idx_admin_alerts_unique_active 
ON public.admin_alerts(alert_type, affected_user_id, affected_entity_id) 
WHERE is_resolved = false;

-- RLS - tylko admini mogą widzieć i zarządzać
ALTER TABLE public.admin_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all alerts"
ON public.admin_alerts FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert alerts"
ON public.admin_alerts FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update alerts"
ON public.admin_alerts FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete alerts"
ON public.admin_alerts FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Dodaj komentarze
COMMENT ON TABLE public.admin_alerts IS 'Alerty systemowe dla administratora - monitoring anomalii bez automatycznej naprawy';
COMMENT ON COLUMN public.admin_alerts.alert_type IS 'Typ alertu: missing_role, missing_training, unapproved_user_24h, orphan_assignment';
COMMENT ON COLUMN public.admin_alerts.severity IS 'Poziom: info, warning, error, critical';
COMMENT ON COLUMN public.admin_alerts.suggested_action IS 'Sugerowana akcja do podjęcia przez admina';

-- Dodaj wpis do cron_settings dla system-health-check
INSERT INTO public.cron_settings (job_name, interval_minutes, is_enabled)
VALUES ('system-health-check', 60, true)
ON CONFLICT (job_name) DO NOTHING;