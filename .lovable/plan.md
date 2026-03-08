

# Fix: Użycie `tf()` zamiast `t()` dla klucza `dashboard.today_is`

## Problem
`t('dashboard.today_is')` zwraca sam klucz gdy brak tłumaczenia, więc fallback `|| 'Dziś jest'` nigdy się nie uruchamia.

## Zmiana

### `src/components/dashboard/widgets/WelcomeWidget.tsx` (linia 134)

Zamienić:
```tsx
{t('dashboard.today_is') || 'Dziś jest'}
```
na:
```tsx
{tf('dashboard.today_is', 'Dziś jest')}
```

`tf()` zwraca fallback gdy tłumaczenie nie istnieje — dokładnie do tego został stworzony.

