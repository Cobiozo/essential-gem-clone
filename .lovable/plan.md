
# Usunięcie widżetu Powiadomień z dashboardu + poprawki dzwoneczka

## 1. Usunięcie NotificationsWidget z dashboardu

**Plik: `src/pages/Dashboard.tsx`**
- Usunięcie importu `NotificationsWidget` (lazy import, linia ~11)
- Usunięcie bloku renderowania widżetu (linie 108-111: Suspense + NotificationsWidget)

Dzwoneczek w górnym pasku (NotificationBellEnhanced) pozostaje jako jedyne miejsce do obsługi powiadomień.

## 2. Poprawki dzwoneczka (NotificationBellEnhanced)

**Plik: `src/components/notifications/NotificationBellEnhanced.tsx`**

### a) Pulsowanie dzwoneczka przy nieodczytanych
- Dodanie klasy `animate-pulse` na ikonie Bell gdy `unreadCount > 0`

### b) Pełna treść powiadomień (nie ucięta)
- Zmiana `line-clamp-1` na `line-clamp-2` dla message (linia 111) — pokaże więcej treści
- Zmiana `truncate` na `line-clamp-2` dla title (linia 106) — tytuł nie będzie ucięty
- Poszerzenie popovera z `w-80` na `w-96` dla lepszej czytelności

### c) Przycisk "Odczytaj wszystkie" — zawsze widoczny
- Przeniesienie przycisku "Przeczytane" do stopki popovera, obok "Zobacz wszystkie"
- Zmiana tekstu na "Odczytaj wszystkie"
- Przycisk widoczny gdy są nieodczytane powiadomienia, niezależnie od liczby powiadomień

### d) Stopka popovera — zawsze widoczna
- Stopka z "Zobacz wszystkie" będzie wyświetlana zawsze (nie tylko gdy > 5 powiadomień)
- Obok przycisku "Zobacz wszystkie" dodany przycisk "Odczytaj wszystkie" (gdy unreadCount > 0)

## Zakres zmian
- `src/pages/Dashboard.tsx` — usunięcie widżetu
- `src/components/notifications/NotificationBellEnhanced.tsx` — poprawki UX
