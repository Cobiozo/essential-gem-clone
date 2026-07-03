## Diagnoza

Sprawdziłem bazę i logi:

- **Kampania testowa istnieje** i jest w statusie `pending`, `test_mode = true`, odbiorca `Sebastian Snopek`, `scheduled_at = 20:52`. Wszystko poprawnie zapisane.
- **CRON `process-event-email-campaigns-every-5min`** działa co 5 min i wywołuje URL edge functiona.
- **Wywołanie zwraca HTTP 404** (widoczne w `net._http_response`) — a `edge_function_logs` dla `process-event-email-campaigns` są **puste**.

Wniosek: **edge function `process-event-email-campaigns` nie został wdrożony (deployed)** na Supabase. Kod jest w repo (`supabase/functions/process-event-email-campaigns/index.ts`) i wpis w `config.toml` istnieje, ale sam deploy nie został wykonany, więc URL zwraca 404 i żaden mail (ani testowy, ani produkcyjny) nigdy nie wychodzi.

## Plan naprawy

1. **Wdrożyć edge function** `process-event-email-campaigns` (aktualny kod z repo, obsługujący `test_mode`).
2. **Wyzwolić ręcznie** funkcję jeden raz zaraz po deployu, żeby nie czekać do 5 min na kolejny tick CRON — istniejąca kampania (Tura 1, TEST → Sebastian) zostanie od razu przetworzona.
3. **Zweryfikować**:
   - `edge_function_logs` pokażą wpisy `[campaigns] tick`, `test=true eligible=1 batch=1`.
   - Rekord w `event_email_campaigns` przejdzie na `status = 'sent'`, `recipients_count = 1`.
   - Pojawi się wpis w `event_email_recipients` (campaign_id = tej kampanii, user_id = Sebastian).
   - W `email_send_log` będzie wysłany mail „Zaproszenie: …" na `sebastiansnopek87@gmail.com`.

Nie zmieniam kodu funkcji — logika testowego trybu jest już poprawna, brakuje tylko wdrożenia.
