

# Naprawa brakujacego tf() w MyMeetingsWidget + lokalizacja stref czasowych

## 1. MyMeetingsWidget.tsx - linia 300

Jedna linia nadal uzywa starego wzorca `t('events.details') || 'Szczegoly'`. Zamienic na `tf('events.details', 'Szczegoly')`.

## 2. timezoneHelpers.ts - COMMON_TIMEZONES

Statyczna tablica `COMMON_TIMEZONES` zawiera polskie nazwy krajow (np. "Polska (CET)", "Wielka Brytania (GMT)", "Nowy Jork (EST)"). Nie mozna uzyc `tf()` w stalej poza komponentem.

**Rozwiazanie**: Dodac nowa funkcje `getCommonTimezones(tf)` ktora zwraca przetlumaczona tablice. Stara stala `COMMON_TIMEZONES` pozostaje jako fallback.

```typescript
type TfFunc = (key: string, fallback: string) => string;

export const getCommonTimezones = (tf: TfFunc) => [
  { value: 'Europe/Warsaw', label: tf('tz.poland', 'Polska') + ' (CET)' },
  { value: 'Europe/London', label: tf('tz.uk', 'Wielka Brytania') + ' (GMT)' },
  // ... wszystkie 30 pozycji
];
```

## 3. WelcomeWidget.tsx - jedyny konsument COMMON_TIMEZONES

Zamienic import `COMMON_TIMEZONES` na `getCommonTimezones` i wywolac wewnatrz komponentu z `tf` z `useLanguage()`.

```typescript
const { tf } = useLanguage();
const localizedTimezones = useMemo(() => getCommonTimezones(tf), [tf]);
```

## Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `src/components/dashboard/widgets/MyMeetingsWidget.tsx` | Linia 300: `t() \|\|` -> `tf()` |
| `src/utils/timezoneHelpers.ts` | Dodac `getCommonTimezones(tf)` z kluczami i18n |
| `src/components/dashboard/widgets/WelcomeWidget.tsx` | Uzyc `getCommonTimezones(tf)` zamiast `COMMON_TIMEZONES` |

