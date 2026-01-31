
# Plan: Dodanie Arizony i synchronizacja list stref czasowych

## Problem

1. **WelcomeWidget** używa własnej statycznej listy 11 stref czasowych, niezależnej od `COMMON_TIMEZONES`
2. Lista w WelcomeWidget nie zawiera `America/Phoenix` (Arizona, MST bez DST)
3. Użytkownik z Arizoną widzi poprawny czas, ale nie może zobaczyć/wybrać swojej strefy z dropdown-a

## Rozwiązanie

### 1. Rozszerzyć COMMON_TIMEZONES w timezoneHelpers.ts

Dodać brakujące popularne strefy czasowe:
- `America/Phoenix` - Arizona (MST, bez zmiany czasu)
- `America/Denver` - Góry Skaliste (MST)
- `America/Anchorage` - Alaska (AKST)
- `Pacific/Honolulu` - Hawaje (HST)
- Dodatkowe europejskie i azjatyckie strefy

### 2. Zaktualizować WelcomeWidget

Zmienić komponent aby używał `COMMON_TIMEZONES` z `timezoneHelpers.ts` zamiast własnej statycznej listy. Dodatkowo - jeśli strefa użytkownika nie jest na liście, automatycznie ją dodać na górze.

## Zmiany w plikach

| Plik | Zmiana |
|------|--------|
| `src/utils/timezoneHelpers.ts` | Dodać Arizona, Denver, Alaska, Hawaii do COMMON_TIMEZONES |
| `src/components/dashboard/widgets/WelcomeWidget.tsx` | Użyć COMMON_TIMEZONES + automatycznie dodać strefę użytkownika |

## Logika dodawania strefy użytkownika

```typescript
import { COMMON_TIMEZONES, getTimezoneAbbr } from '@/utils/timezoneHelpers';

const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

const timezones = useMemo(() => {
  // Sprawdź czy strefa użytkownika jest na liście
  const userTzExists = COMMON_TIMEZONES.some(tz => tz.value === userTimezone);
  
  if (userTzExists) {
    return COMMON_TIMEZONES;
  }
  
  // Dodaj strefę użytkownika na górę listy
  const cityName = userTimezone.split('/').pop()?.replace('_', ' ') || userTimezone;
  const abbr = getTimezoneAbbr(userTimezone);
  
  return [
    { value: userTimezone, label: `${cityName} (${abbr})` },
    ...COMMON_TIMEZONES
  ];
}, [userTimezone]);
```

## Rozszerzona lista COMMON_TIMEZONES

Dodać do listy:
```typescript
// USA - dodatkowe strefy
{ value: 'America/Phoenix', label: 'Arizona (MST)' },
{ value: 'America/Denver', label: 'Denver (MST)' },
{ value: 'America/Anchorage', label: 'Alaska (AKST)' },
{ value: 'Pacific/Honolulu', label: 'Hawaje (HST)' },
```

## Rezultat

Po zmianie:
- Arizona (`America/Phoenix`) będzie widoczna w dropdown-ie
- Jeśli użytkownik ma ustawioną jakąkolwiek inną strefę spoza listy - pojawi się automatycznie na górze
- WelcomeWidget będzie zsynchronizowany z centralną listą stref czasowych
