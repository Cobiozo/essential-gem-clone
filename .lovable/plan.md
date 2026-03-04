

## Plan: Selektor godziny co 30 minut + zmiana interwału CRON

### 1. Selektor godziny w formularzu kontaktu (`PrivateContactForm.tsx`)

Zamienić `<Input type="time">` na dwa `<Select>`:
- **Godzina**: 00–23
- **Minuty**: 00 lub 30

Przy ładowaniu istniejącej wartości `reminder_time` zaokrąglić minuty do najbliższego 00/30. Wartość `formData.reminder_time` nadal przechowywana jako `"HH:mm"`.

Walidacja w `handleSubmit` — usunąć regex `/^\d{2}:\d{2}$/`, bo selecty zawsze dają poprawny format.

### 2. Zmiana domyślnego interwału CRON (`CronJobsManagement.tsx`)

W `INTERVAL_OPTIONS` zmienić domyślny interwał — bez zmian w kodzie, ale wykonać SQL:
```sql
UPDATE cron_settings SET interval_minutes = 30 WHERE job_name = 'process-pending-notifications';
```
Oraz zaktualizować pg_cron schedule na `*/30 * * * *`.

### Zakres plików
- `src/components/team-contacts/PrivateContactForm.tsx` — zamiana input time na 2 selecty (godzina + minuta 00/30)
- SQL w bazie — zmiana interwału CRON na 30 min

