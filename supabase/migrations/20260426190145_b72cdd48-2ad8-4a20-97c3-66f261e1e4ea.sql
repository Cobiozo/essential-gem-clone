ALTER TABLE public.paid_events
  ADD COLUMN IF NOT EXISTS show_in_dashboard_calendar boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.paid_events.show_in_dashboard_calendar IS 'Gdy true, wydarzenie pojawia się w kalendarzu pulpitu (CalendarWidget) jako kategoria EVENT (czerwona kropka).';