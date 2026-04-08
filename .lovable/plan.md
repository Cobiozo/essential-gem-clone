

# Naprawa powiadomien i wyswietlania prywatnych wiadomosci od admina

## Problemy

1. **Powiadomienia nie maja ikony wiadomosci** — typ `direct_message` nie jest obslugiwany w `getNotificationIcon`, wiec wyswietla sie generyczna ikona `Info` zamiast ikony wiadomosci
2. **Sekcja "Od Administratora" w sidebarze** — prywatne wiadomosci od admina sa pogrupowane pod naglowkiem "Od Administratora", co wyglada jak kanal broadcast. Uzytkownik powinien widziec te rozmowy jako normalne prywatne konwersacje z imieniem i nazwiskiem admina, nie jako kanal zbiorczy

## Zmiany

### 1. Ikona wiadomosci w powiadomieniach

**Pliki:** `src/components/notifications/NotificationBell.tsx` i `src/components/dashboard/widgets/NotificationsWidget.tsx`

Dodac case `direct_message` do `getNotificationIcon` — zwracajac ikone `MessageSquare` (lub `Mail`) w kolorze wyrozniajacym wiadomosci prywatne.

### 2. Sekcja prywatnych konwersacji z adminem w sidebarze

**Plik:** `src/components/messages/MessagesSidebar.tsx`

Zmienic naglowek sekcji dla nie-adminow z "Od Administratora" na "Wiadomosci prywatne" (lub "Rozmowy prywatne"). Konwersacje z adminem to normalne czaty 1:1, wiec powinny byc prezentowane identycznie jak inne prywatne rozmowy — z imieniem i nazwiskiem admina oraz statusem konwersacji, a nie pod generycznym naglowkiem kanalu.

Status label zmieni sie z `'Administrator'` na role/status konwersacji (np. imie admina jest juz wyswietlane w `ConversationListItem` z `conv.firstName conv.lastName`).

### Podsumowanie

| Plik | Zmiana |
|------|--------|
| `NotificationBell.tsx` | Dodac `case 'direct_message'` z ikona `MessageSquare` |
| `NotificationsWidget.tsx` | Dodac `case 'direct_message'` z ikona `MessageSquare` |
| `MessagesSidebar.tsx` | Naglowek "Od Administratora" → "Wiadomosci prywatne", status label: rola zamiast "Administrator" |

