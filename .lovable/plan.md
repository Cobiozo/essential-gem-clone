

# Diagnoza: Biała strona z błędami 404

## Problem
Podgląd pokazuje pustą stronę. Błędy w konsoli to:
- **404 na plikach JS** (chunki) — stare referencje do plików, które już nie istnieją po nowym buildzie
- Ostrzeżenia RS SDK (Google Ads, TikTok) — nieszkodliwe, nie powodują białej strony
- Iframe sandbox warnings — standardowe, nieszkodliwe

## Przyczyna
To **nie jest błąd w kodzie**. Przejrzałem wszystkie zmienione pliki (`AutoWebinarAccessManagement.tsx`, `WebinarInviteWidget.tsx`, `NotificationPermissionBanner.tsx`, `AutoWebinarEmbed.tsx`, `EventsManagement.tsx`) — nie ma błędów składni, typów, ani importów.

Błędy 404 na chunkach oznaczają, że przeglądarka próbuje załadować pliki JS ze starego buildu, które już nie istnieją na serwerze. To typowy problem po aktualizacji — **wystarczy odświeżyć stronę** (Ctrl+Shift+R / hard reload).

## Rozwiązanie
1. **Hard refresh** podglądu (Ctrl+Shift+R lub kliknij ikonę odświeżenia w panelu podglądu)
2. Jeśli dalej nie działa — wyczyścić cache przeglądarki dla tej strony

Nie ma zmian w kodzie do wykonania.

