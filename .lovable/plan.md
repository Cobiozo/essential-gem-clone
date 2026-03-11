

# Fix: Kopiowanie wiadomości OTP na telefonie

## Problem
Gdy `copyAfterAsync` zawiedzie na iOS/mobile (brak wsparcia `ClipboardItem` z Promise, utracony kontekst gestu użytkownika), kod:
1. Zamyka dialog (linia 146) — użytkownik traci dostęp do wiadomości
2. Pokazuje toast "skopiuj ręcznie z pola poniżej" — ale nie ma żadnego pola

## Rozwiązanie

### `src/pages/HealthyKnowledge.tsx`
- Gdy `success === false`: **nie zamykać dialogu**, zamiast tego zaktualizować `shareMessage` treścią z edge function i pokazać przycisk "Kopiuj" (synchroniczny `copyToClipboard` w kontekście gestu)
- Dodać stan `generatedMessage` + `generatedCode` do przechowywania wygenerowanej wiadomości
- W dialogu: po wygenerowaniu kodu, textarea pokazuje pełną wiadomość z przyciskiem "Kopiuj wiadomość" obok

### `src/lib/clipboardUtils.ts`
- W `copyAfterAsync`: dodać lepszy fallback — gdy `ClipboardItem` zawiedzie, użyć `setTimeout(0)` trick z `execCommand` (pomaga na niektórych przeglądarkach)
- Dodać dodatkowy fallback: `textarea` z `contentEditable` div (lepsze wsparcie w WKWebView/in-app browsers)

### Przepływ po zmianach
1. User klika "Generuj kod i kopiuj"
2. Edge function generuje kod → próba `copyAfterAsync`
3. **Sukces** → toast + zamknij dialog (jak teraz)
4. **Porażka** → toast info + dialog pozostaje otwarty z pełną wiadomością w textarea + przycisk "Kopiuj wiadomość" (synchroniczny copy w kontekście kliknięcia)

### Pliki do edycji
1. `src/lib/clipboardUtils.ts` — lepsze fallbacki
2. `src/pages/HealthyKnowledge.tsx` — nie zamykać dialogu przy porażce, przycisk kopiowania

