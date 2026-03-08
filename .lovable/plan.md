

# Plan: Ujednolicenie koloru napisów w WelcomeWidget

## Problem
W jasnym motywie tekst powitania i zegara używa `text-amber-600` (pomarańczowy), a w ciemnym `text-gold` (złoty). Użytkownik chce złotego koloru w obu trybach.

## Zmiana

### `src/components/dashboard/widgets/WelcomeWidget.tsx`

Zamienić wszystkie wystąpienia `text-amber-600 dark:text-gold` na `text-gold` oraz `text-amber-600/70 dark:text-gold/70` na `text-gold/70`.

Dotyczy:
- Nagłówek powitania (linia 124)
- Zegar (linia 136)
- Ikona zegara (linia 137)

