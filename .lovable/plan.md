

# Parametr `slot` w linku zaproszeniowym auto-webinaru

## Zakres zmian

### 1. `AutoWebinarEventView.tsx` — dodanie `&slot=HH:MM` do URL
W `handleCopy` (linia ~97-99): dołączyć wybrany czas slotu do linku zaproszeniowego.

```
/e/{slug}?ref={EQID}&slot=14:00
```

### 2. `EventRegistrationBySlug.tsx` — przekazanie `slot` do redirecta
Odczytać `searchParams.get('slot')` i dołączyć jako parametr do URL redirecta:

```
/events/register/{eventId}?invited_by={userId}&slot=14:00
```

### 3. `EventGuestRegistration.tsx` — odczyt `slot` i pre-select terminu
Odczytać `searchParams.get('slot')`. Jeśli obecny i jest to auto-webinar:
- Zamiast obliczać `getNextSlot()`, użyć slotu z URL (najbliższa data kiedy ten slot jest dostępny — dziś jeśli jeszcze w przyszłości, jutro jeśli minął)
- Wyświetlić wybrany termin w formularzu rejestracyjnym

## Pliki do zmiany

| Plik | Zmiana |
|---|---|
| `src/components/auto-webinar/AutoWebinarEventView.tsx` | Dodać `&slot={time}` do URL w `handleCopy` |
| `src/pages/EventRegistrationBySlug.tsx` | Przekazać param `slot` do redirecta |
| `src/pages/EventGuestRegistration.tsx` | Odczytać `slot`, użyć jako pre-selected termin |

