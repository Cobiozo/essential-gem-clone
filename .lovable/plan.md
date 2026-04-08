

# Plan: Powiadomienia o wiadomosciach na ikonie czatu, nie w dzwoneczku

## Problem

Obecnie powiadomienia typu `direct_message` pojawiaja sie w dzwoneczku (NotificationBell). Powinny byc widoczne **wylacznie** na ikonie czatu (MessageSquare), ktora juz poprawnie wyswietla badge `totalUnread` z tabeli `role_chat_messages`.

## Wazne zalozenia

- Ikona czatu jest juz poprawnie wyswietlana dla uzytkownikow z dostepem — zarowno przez role (`chat_sidebar_visibility`), jak i przez indywidualny override admina (`chat_user_visibility`). Funkcja `isRoleVisibleForChat` sprawdza `_userOverride` w pierwszej kolejnosci.
- Uzytkownicy bez dostepu do czatu nie otrzymuja wiadomosci, wiec nie potrzebuja ikony czatu.
- Rekord `direct_message` w `user_notifications` nadal jest potrzebny do triggerowania emaili — usuwamy go tylko z **wyswietlania** w dzwoneczku.

## Zmiany

### 1. `src/hooks/useNotifications.ts` — odfiltrowac `direct_message`

Trzy miejsca:

- **`fetchNotifications`** — dodac `.neq('notification_type', 'direct_message')` do zapytania
- **`fetchUnreadCount`** — dodac ten sam filtr
- **Realtime callback (INSERT)** — ignorowac powiadomienia z `notification_type === 'direct_message'`

Dzieki temu dzwoneczek nie bedzie liczyc ani wyswietlac powiadomien o wiadomosciach czatu.

### 2. `src/components/notifications/NotificationBell.tsx` — usunac case `direct_message`

Usunac `case 'direct_message'` z `getNotificationIcon` — skoro te powiadomienia nie beda juz wyswietlane w dzwoneczku, case jest zbedny.

### 3. `src/components/dashboard/widgets/NotificationsWidget.tsx` — odfiltrowac `direct_message`

W widgecie na dashboardzie odfiltrowac powiadomienia typu `direct_message` z wyswietlanej listy.

## Pliki do edycji

| Plik | Zmiana |
|------|--------|
| `src/hooks/useNotifications.ts` | `.neq('notification_type', 'direct_message')` w fetch, unreadCount i realtime |
| `src/components/notifications/NotificationBell.tsx` | Usunac case `direct_message` z getNotificationIcon |
| `src/components/dashboard/widgets/NotificationsWidget.tsx` | Odfiltrowac `direct_message` z listy |

## Co pozostaje bez zmian

- Ikona czatu w topbarze — juz poprawnie pokazuje `totalUnread` i uwzglednia indywidualne uprawnienia uzytkownika (override admina)
- Wstawianie rekordu `direct_message` do `user_notifications` — nadal potrzebne do emaili i deep-linkow
- Tabela `chat_user_visibility` — indywidualne wlaczenie czatu przez admina dziala poprawnie i jest brane pod uwage przy renderowaniu ikony

