

# Poprawka: Przycisk zaproszenia tylko gdy administrator włączył tę opcję

## Problem
Flaga języka i przycisk "Zaproś" wyświetlają się dla **wszystkich** wydarzeń grupowych, niezależnie od ustawienia `allow_invites` w bazie danych. Administrator kontroluje tę opcję przy tworzeniu wydarzenia przełącznikiem "Zezwól na zapraszanie gości".

## Rozwiązanie
**Plik:** `src/components/dashboard/widgets/MyMeetingsWidget.tsx`

Linia 511 — zmienić warunek z:
```typescript
{isGroupType && (
```
na:
```typescript
{isGroupType && (event as any).allow_invites === true && (
```

Pole `allow_invites` jest już dostępne w obiekcie `event` (pochodzi z tabeli `events` i jest częścią `EventWithRegistration`). Tak samo jest to zaimplementowane w `EventCard.tsx` i `EventCardCompact.tsx`.

Jedna linia do zmiany.

