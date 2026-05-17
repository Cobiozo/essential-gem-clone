## Plan: przełącznik powiadomień email z czatu

Dodam w **Moje konto → Powiadomienia** (komponent `UserNotificationCenter`, zakładka „Ustawienia") nową kartę „Powiadomienia email" z jednym przełącznikiem:

- **„Email, gdy ktoś napisze do mnie wiadomość, a jestem offline"** — domyślnie włączony.

Po wyłączeniu wiadomości czatu nie będą wysyłane na email (push i powiadomienia w aplikacji działają bez zmian).

## Szczegóły techniczne

- Plik: `src/components/notifications/UserNotificationCenter.tsx`
- Tabela: `user_notification_preferences`, kolumna `email_on_offline` (już istnieje, używana przez Edge Function `send-chat-notification-email`).
- Odczyt: `select email_on_offline where user_id = auth.uid() and event_type_id is null` (wiersz globalny).
- Zapis: `upsert` przy zmianie przełącznika; jeśli brak wiersza — `insert` z `event_type_id = null`.
- Bez zmian w bazie i bez zmian w Edge Function.