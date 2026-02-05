# Plan: Rozbudowa systemu czatu - Opiekun, Czat grupowy, Powiadomienia

## Status: ✅ Zaimplementowane

---

## Część 1: Wiadomości do opiekuna
**Status: ✅ Gotowe** - Funkcjonalność już istniała w systemie.

---

## Część 2: Czat grupowy z zespołem
**Status: ✅ Zaimplementowane**

### Zaimplementowane zmiany:
- `TeamMembersSection.tsx` - Dodano tryb zaznaczania z checkboxami i przyciskiem "Wybierz"
- `CreateGroupChatDialog.tsx` - Nowy dialog do tworzenia czatu grupowego (temat + wiadomość)
- `MessagesSidebar.tsx` - Przekazywanie props grupowych
- `MessagesPage.tsx` - Stan selekcji, integracja dialogu
- `useUnifiedChat.ts` - Nowa funkcja `createGroupChat()`

---

## Część 3: Powiadomienia Push i Email
**Status: ✅ Zaimplementowane**

### Zaimplementowane zmiany:

**Browser Notifications (gdy app w tle):**
- `useBrowserNotifications.ts` - Nowy hook obsługujący Web Notification API
- `useNotifications.ts` - Integracja z browser notifications (gdy `document.hidden`)
- Automatyczna prośba o uprawnienia przy pierwszej wizycie na /messages

**Email Notifications (gdy offline):**
- `send-chat-notification-email/index.ts` - Edge Function sprawdzająca `last_seen_at`
- Wysyła email przez Resend jeśli użytkownik nieaktywny >5 minut
- `useUnifiedChat.ts` - Wywołanie Edge Function przy `sendDirectMessage()` i `createGroupChat()`

**Śledzenie aktywności:**
- `useLastSeenUpdater.ts` - Nowy hook aktualizujący `last_seen_at` co 2 minuty
- Integracja w `App.tsx` przez `InactivityHandler`

**Baza danych:**
- Kolumna `last_seen_at` w tabeli `profiles`
- Tabela `user_notification_preferences` (email_on_offline, browser_notifications)
- RLS policies dla preferencji

---

## Pliki utworzone/zmodyfikowane

| Plik | Typ | Status |
|------|-----|--------|
| `src/hooks/useBrowserNotifications.ts` | Nowy | ✅ |
| `src/hooks/useLastSeenUpdater.ts` | Nowy | ✅ |
| `src/components/messages/CreateGroupChatDialog.tsx` | Nowy | ✅ |
| `src/components/messages/TeamMembersSection.tsx` | Modyfikacja | ✅ |
| `src/components/messages/MessagesSidebar.tsx` | Modyfikacja | ✅ |
| `src/pages/MessagesPage.tsx` | Modyfikacja | ✅ |
| `src/hooks/useUnifiedChat.ts` | Modyfikacja | ✅ |
| `src/hooks/useNotifications.ts` | Modyfikacja | ✅ |
| `src/App.tsx` | Modyfikacja | ✅ |
| `supabase/functions/send-chat-notification-email/index.ts` | Nowy | ✅ |
| `supabase/config.toml` | Modyfikacja | ✅ |
| Migracja SQL | Nowa | ✅ |
