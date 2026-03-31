

# Naprawa widoku kontaktów prywatnych na mobile

## Problem
Na ekranie 390px komponenty `EventGroupedContacts` i `TeamContactAccordion` mają fatalny layout:
- Nazwa kontaktu, email, telefon i data rejestracji wyświetlane w jednym wierszu — tekst się łamie chaotycznie
- Przyciski akcji (5 ikon) wyświetlane obok treści zamiast pod nią — brak miejsca
- Nagłówek wydarzenia (tytuł + badge gości) ściska się na wąskim ekranie
- Badge'e ("W mojej liście", "Zapisany na X wydarzeń") nie mieszczą się

## Rozwiązanie

### 1. `EventGroupedContacts.tsx` — główny problem ze screenshota

**Nagłówek wydarzenia (linie 103-120):**
- Zmienić na `flex flex-col sm:flex-row` — na mobile tytuł i badge gości w stosie pionowym

**Wiersz kontaktu (linie 141-223):**
- Zmienić layout na `flex flex-col` na mobile zamiast `flex items-center justify-between`
- Nazwa + badge'e w górnym wierszu
- Email/telefon/data w osobnym wierszu z `truncate` i `overflow-hidden`
- Przyciski akcji przeniesione do osobnego rzędu pod danymi z wcięciem `pl-0 sm:pl-0`

**Dane kontaktowe (linie 173-179):**
- Zmienić z `flex items-center gap-3` na `flex flex-col sm:flex-row` — na mobile jedno pod drugim
- Dodać `truncate` na email

### 2. `TeamContactAccordion.tsx` — audyt potwierdza OK

Ten komponent już ma poprawki mobile (`flex flex-col`, `pl-[52px]`, `truncate`, `max-w-[160px]`). Drobne usprawnienia:
- Sprawdzić czy `max-w-[160px]` na nazwisku nie jest za małe — zwiększyć do `max-w-[200px]`

### 3. `TeamContactsTab.tsx` — nawigacja sub-tabów

Przyciski sub-tabów ("Z zaproszeń na BO", "Z zaproszeń na HC", etc.) na mobile mogą się ściskać:
- Upewnić się że kontener ma `flex-wrap` i `gap-2` (sprawdzić obecny stan)

## Podsumowanie zmian

| Plik | Zmiana |
|------|--------|
| `EventGroupedContacts.tsx` | Przebudowa layoutu kontaktu i nagłówka na mobile-first (flex-col → sm:flex-row) |
| `TeamContactAccordion.tsx` | Drobna korekta max-w na nazwisku |
| `TeamContactsTab.tsx` | Weryfikacja flex-wrap na sub-nawigacji (jeśli brakuje) |

