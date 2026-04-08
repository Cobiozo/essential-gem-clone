

# Plan: Dźwięki powiadomień — dzwonek i czat

## Problem

Gdy użytkownik ma otwartą kartę i jest zalogowany, nie otrzymuje żadnego sygnału dźwiękowego o nowych powiadomieniach ani wiadomościach czatu.

## Rozwiązanie

Dwa różne dźwięki:
- **Dzwonek (bell)** — krótki dźwięk dla nowych powiadomień systemowych (dzwoneczek)
- **Czat (chat)** — inny dźwięk dla nowych wiadomości prywatnych (ikona MessageSquare)

Dźwięki będą odtwarzane tylko gdy karta jest aktywna LUB w tle — użytkownik usłyszy sygnał niezależnie od tego, czy patrzy na ekran.

## Zmiany

### 1. Wygenerować pliki dźwiękowe

**Lokalizacja:** `public/sounds/notification.mp3` i `public/sounds/message.mp3`

Wygenerować dwa krótkie dźwięki (< 1s) za pomocą Web Audio API w skrypcie buildowym lub użyć darmowych plików MP3. Notification — pojedynczy dzwonek, message — podwójny „pop".

### 2. Nowy hook `src/hooks/useNotificationSound.ts`

Hook zarządzający odtwarzaniem dźwięków:
- Preładowuje oba pliki Audio przy montowaniu
- Eksportuje `playNotificationSound()` i `playMessageSound()`
- Respektuje ustawienie użytkownika (localStorage: `notification-sounds-enabled`, domyślnie `true`)
- Zabezpieczenie przed spamem — minimum 2s odstęp między dźwiękami tego samego typu

### 3. Integracja w `src/hooks/useNotifications.ts`

W callbacku realtime (linia ~223, event INSERT) po dodaniu powiadomienia do stanu — wywołać `playNotificationSound()`.

### 4. Integracja w `src/hooks/useUnifiedChat.ts`

W callbacku realtime (linia ~1050, event INSERT) gdy przychodzi nowa wiadomość od innego użytkownika (`record.sender_id !== user.id`) — wywołać `playMessageSound()`.

### 5. Przełącznik w ustawieniach (opcjonalnie w menu użytkownika)

Dodać prosty toggle w dropdownie użytkownika (DashboardTopbar) lub w panelu narzędziowym, pozwalający wyciszyć dźwięki powiadomień. Wartość zapisywana w `localStorage`.

## Pliki do utworzenia/edycji

| Plik | Zmiana |
|------|--------|
| `public/sounds/notification.mp3` | Nowy — dźwięk powiadomienia |
| `public/sounds/message.mp3` | Nowy — dźwięk wiadomości czatu |
| `src/hooks/useNotificationSound.ts` | Nowy — hook odtwarzania dźwięków |
| `src/hooks/useNotifications.ts` | Wywołanie `playNotificationSound()` w realtime INSERT |
| `src/hooks/useUnifiedChat.ts` | Wywołanie `playMessageSound()` w realtime INSERT |
| `src/components/dashboard/DashboardTopbar.tsx` | Toggle wyciszenia dźwięków (ikona Volume2/VolumeX) |

