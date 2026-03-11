

# Fix: Kopiowanie wiadomości na mobile nie działa

## Problem
Dwa problemy z `handleManualCopy` i `handleGenerateAndCopy`:

1. **Dynamic import w handlerze**: `await import('@/lib/clipboardUtils')` w `handleManualCopy` (linia 170) i `handleGenerateAndCopy` (linia 131) — nawet jeśli moduł jest cache'owany, `await` przerywa synchroniczny call stack gestu użytkownika na iOS Safari, przez co `navigator.clipboard.writeText` rzuca "NotAllowedError".

2. **Brak fallbacku do Web Share API**: Na mobile `navigator.share()` działa zawsze i pozwala wysłać tekst bezpośrednio do WhatsApp/SMS/email — lepsze niż clipboard.

## Zmiany

### `src/pages/HealthyKnowledge.tsx`
1. **Import na górze** — przenieść `import { copyToClipboard, copyAfterAsync } from '@/lib/clipboardUtils'` na top-level zamiast dynamic import w handlerach
2. **handleManualCopy** — dodać `navigator.share()` jako pierwszą opcję na mobile (tekst wiadomości), fallback do `copyToClipboard`
3. **handleGenerateAndCopy** — usunąć dynamic import, użyć top-level importu

### `src/lib/clipboardUtils.ts`
- Bez zmian — logika jest poprawna, problem jest w sposobie wywoływania

## Efekt
- Na mobile: przycisk "Kopiuj wiadomość" spróbuje `navigator.share()` (natywne udostępnianie), potem `copyToClipboard` synchronicznie (bez await na import)
- Na desktop: `copyToClipboard` działa jak dotychczas

