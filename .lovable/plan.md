

# Problem: Logo 404 + weryfikacja powiadomień dla zaproszonych gości

## 1. Brakujące logo — przyczyna

Stary URL logo (`training-media` bucket):
```
https://xzlhssqqbajqhnsmbucf.supabase.co/storage/v1/object/public/training-media/1766508615455-8wv0cee7jwr.png
```
Zwraca **404 — Object not found**. Plik został usunięty lub przeniesiony.

Aktualne logo istnieje w bucket `cms-images`:
```
https://xzlhssqqbajqhnsmbucf.supabase.co/storage/v1/object/public/cms-images/logo-1772644418932.png
```
(Biała kropla na przezroczystym tle — widoczna na złotym nagłówku)

Ten sam problem dotyczy **4 edge functions** — wszystkie używają nieaktualnego URL:
- `send-webinar-confirmation`
- `send-prospect-meeting-email`
- `send-meeting-reminders`
- `generate-meeting-guest-token`

## 2. Powiadomienia dla gości zaproszonych przez partnera — status

Flow jest prawidłowy:
1. `InviteToEventDialog` wywołuje `register_event_guest` RPC → tworzy rekord w `guest_event_registrations`
2. Następnie wywołuje `send-webinar-confirmation` z `source: 'partner_invite'` → email potwierdzający
3. CRON (`process-pending-notifications`) automatycznie wysyła przypomnienia (24h, 12h, 2h, 1h, 15min) na podstawie rekordów w `guest_event_registrations` — **niezależnie od source**

Gość zaproszony przez partnera dostanie pełny harmonogram przypomnień, identyczny jak przy samodzielnej rejestracji.

## Plan zmian

### Zmiana URL logo we wszystkich 4 edge functions

| Plik | Zmiana |
|------|--------|
| `supabase/functions/send-webinar-confirmation/index.ts` | Zamiana `logoUrl` na działający URL z `cms-images` |
| `supabase/functions/send-prospect-meeting-email/index.ts` | Zamiana `logoUrl` |
| `supabase/functions/send-meeting-reminders/index.ts` | Zamiana `logoUrl` |
| `supabase/functions/generate-meeting-guest-token/index.ts` | Zamiana `logoUrl` |

Nowy URL:
```
https://xzlhssqqbajqhnsmbucf.supabase.co/storage/v1/object/public/cms-images/logo-1772644418932.png
```

Wszystkie 4 edge functions zostaną ponownie wdrożone po zmianie.

