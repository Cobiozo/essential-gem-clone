
## Cel

1. Zastąpić wszystkie wystąpienia `purelife.info.pl` domeną `purelifecenter.pl` (kod + baza).
2. Dodać w panelu admina globalne ustawienie **App URL** (bazowy URL aplikacji), aby w przyszłości zmiana domeny nie wymagała edycji kodu.

---

## Zakres audytu (co zostanie zmienione)

**Baza danych (UPDATE):**
- `page_settings.app_base_url` → `https://purelifecenter.pl`
- `training_lessons.media_url` (134 rekordy) — replace `purelife.info.pl` → `purelifecenter.pl`
- `healthy_knowledge.media_url` (54 rekordy) — jw.
- `knowledge_resources.source_url` (34 rekordy) — jw.
- `email_templates` (2 szablony) — replace w `body_html`/`subject`
- `support_settings.email_address` → `support@purelifecenter.pl`
- `smtp_settings.sender_email` → `noreply@purelifecenter.pl` (analogicznie)

**Kod frontend (18 plików) — wszystkie hardkodowane `purelife.info.pl`:**
`index.html` (og:url), `server.js` (PRODUCTION_DOMAIN + CORS), `src/hooks/useSubdomainDetection.ts`, `src/hooks/useLocalStorage.ts`, `src/lib/mediaTokenService.ts`, `src/components/SecureMedia.tsx`, `src/components/admin/AutoWebinarManagement.tsx`, `src/components/admin/EmailDeliveryDashboard.tsx`, `src/components/admin/DnsDiagnosticPanel.tsx`, `src/pages/{Admin,MyAccount,LeaderLandingPage,EventGuestRegistration,TrainingModule}.tsx`, `src/contexts/AuthContext.tsx`, `src/utils/invitationTemplates.ts`, komponenty dashboard/widgets/events/healthy-knowledge/homepage/auto-webinar (kilkanaście punktów) — zmiana `purelife.info.pl` → `purelifecenter.pl` i `@purelife.info.pl` → `@purelifecenter.pl` w adresach mailto/tekstach.

**Edge functions (24 pliki) — fallbacki i adresy mailto:**
`activate-email`, `admin-reset-password`, `admin-resend-event-order-confirmation`, `confirm-free-event-reservation`, `register-free-event-order`, `register-event-transfer-order`, `send-event-form-confirmation`, `send-welcome-email`, `send-password-reset`, `og-meta-proxy`, `google-oauth-callback`, `generate-hk-otp`, `send-chat-notification-email`, `cleanup-inactive-training`, `send-admin-activity-digest`, `send-inactivity-warning`, `send-inactivity-final-warning`, `send-support-email`, `send-post-event-thank-you`, `send-guest-thank-you-email`, `send-meeting-reminders`, `send-prospect-meeting-email`, `send-push-notification`, `generate-vapid-keys`, `generate-meeting-guest-token`, `process-pending-notifications`.

**Historyczne migracje SQL** — nie ruszamy (to zapis historii). Poprawa danych przez nową migrację UPDATE.

---

## Nowa funkcja: globalne ustawienie App URL w panelu admina

Tabela `page_settings` już posiada kolumnę `app_base_url`. Wykorzystamy ją jako **jedyne źródło prawdy**.

**Zmiany:**
1. **Panel admina** — w `src/pages/Admin.tsx` (sekcja "Ustawienia strony" / gdzie już edytowany jest `app_base_url`, placeholder `https://purelife.info.pl` na miejscu 3804) dodać/wyeksponować pole:
   - Label: „Bazowy adres URL aplikacji (App URL)"
   - Placeholder i domyślna wartość: `https://purelifecenter.pl`
   - Podpowiedź: „Używany we wszystkich linkach w e-mailach (rejestracje, potwierdzenia, reset hasła, zaproszenia, OTP itp.)"
   - Walidacja: musi zaczynać się od `https://`, bez trailing `/`.

2. **Frontend — helper `src/lib/appUrl.ts`** (nowy plik):
   ```ts
   let cached: string | null = null;
   export async function getAppBaseUrl(): Promise<string> {
     if (cached) return cached;
     const { data } = await supabase.from('page_settings').select('app_base_url').maybeSingle();
     cached = (data?.app_base_url || 'https://purelifecenter.pl').replace(/\/$/, '');
     return cached;
   }
   export function getAppBaseUrlSync(fallback = 'https://purelifecenter.pl'): string {
     return cached || fallback;
   }
   ```
   Podmieniamy hardkody `'https://purelife.info.pl'` w komponentach na wynik `getAppBaseUrl()` (lub `window.location.origin` tam, gdzie chodzi po prostu o „bieżącą domenę" — np. `ReflinkQRCode`, `ReflinkPreviewDialog` już tak działają).

3. **Edge functions — jednolity pattern**:
   ```ts
   async function resolveAppBase(supabase): Promise<string> {
     const { data } = await supabase.from('page_settings').select('app_base_url').maybeSingle();
     return (Deno.env.get('SITE_URL') || data?.app_base_url || 'https://purelifecenter.pl').replace(/\/$/, '');
   }
   ```
   Wszystkie 24 funkcje przechodzą na ten helper zamiast literału `"https://purelife.info.pl"`. `APP_BASE` w `activate-email` liczone raz w handlerze (nie top-level).

4. **`useSubdomainDetection.ts`** — matcher zmienia się na `.purelifecenter.pl` (subdomeny partnerskie muszą chodzić już pod nową domeną).

5. **`server.js`** — `PRODUCTION_DOMAIN` domyślnie `https://purelifecenter.pl`, CORS whitelist analogicznie. (Jeśli sekret `PRODUCTION_DOMAIN` jest ustawiony w prod, i tak nadpisuje — bezpieczne.)

6. **`mediaTokenService.ts` + `SecureMedia.tsx`** — checki `url.includes('purelife.info.pl')` zmieniamy na `url.includes('purelifecenter.pl')` (proxy tokenów i strategia preload dla wideo).

7. **`index.html`** — `og:url` → `https://purelifecenter.pl`.

---

## Sekcja techniczna

**Migracja 1 (SQL — data update):**
```sql
UPDATE page_settings SET app_base_url = 'https://purelifecenter.pl'
  WHERE app_base_url ILIKE '%purelife.info.pl%';
UPDATE training_lessons SET media_url = REPLACE(media_url, 'purelife.info.pl', 'purelifecenter.pl')
  WHERE media_url ILIKE '%purelife.info.pl%';
UPDATE healthy_knowledge SET media_url = REPLACE(media_url, 'purelife.info.pl', 'purelifecenter.pl')
  WHERE media_url ILIKE '%purelife.info.pl%';
UPDATE knowledge_resources SET source_url = REPLACE(source_url, 'purelife.info.pl', 'purelifecenter.pl')
  WHERE source_url ILIKE '%purelife.info.pl%';
UPDATE email_templates
  SET body_html = REPLACE(body_html, 'purelife.info.pl', 'purelifecenter.pl'),
      subject  = REPLACE(subject,  'purelife.info.pl', 'purelifecenter.pl')
  WHERE body_html ILIKE '%purelife.info.pl%' OR subject ILIKE '%purelife.info.pl%';
UPDATE support_settings SET email_address = REPLACE(email_address, '@purelife.info.pl', '@purelifecenter.pl')
  WHERE email_address ILIKE '%@purelife.info.pl%';
UPDATE smtp_settings SET sender_email = REPLACE(sender_email, '@purelife.info.pl', '@purelifecenter.pl')
  WHERE sender_email ILIKE '%@purelife.info.pl%';
```
(To operacja UPDATE — pójdzie przez insert tool, nie migration.)

**Global replace w kodzie** — sed po plikach z listy audytu:
- `https://purelife.info.pl` → `https://purelifecenter.pl`
- `purelife.info.pl` (bare host) → `purelifecenter.pl`
- `@purelife.info.pl` → `@purelifecenter.pl`

Po replace weryfikacja: `rg "purelife\.info\.pl"` musi zwrócić tylko historyczne migracje w `supabase/migrations/`.

**Sekret `SITE_URL`** (edge functions) — zaktualizować w Supabase → Settings → Functions na `https://purelifecenter.pl` (poinformuję użytkownika, żeby ustawił; alternatywnie zdejmiemy zależność od sekretu i zawsze czytamy z `page_settings`).

---

## Poza zakresem (nie ruszam)

- Historyczne pliki `supabase/migrations/*.sql` — pozostają jako zapis historii.
- Konfiguracja Cloudflare / DNS / SMTP domeny nadawczej (SPF/DKIM/DMARC dla `purelifecenter.pl`) — to po stronie użytkownika/administratora domeny.
- Rekordy `reply_to`/inbox przekierowań poczty — poza aplikacją.

---

## Ryzyka

- **E-maile już wysłane** z linkami `purelife.info.pl` przestaną działać, jeśli stara domena nie jest utrzymywana/redirectuje.
- **SITE_URL secret** — jeśli ustawiony, wygrywa nad `page_settings`. Trzeba zaktualizować w panelu Supabase (przypomnę po wdrożeniu).
- **VAPID `subject`** (`mailto:support@purelifecenter.pl`) w `send-push-notification`/`generate-vapid-keys` — zmiana wymaga nowej pary kluczy VAPID tylko jeśli push już działa; w praktyce zmiana samego `subject` jest bezpieczna, klucze zostają.

Po akceptacji planu przechodzę do implementacji.
