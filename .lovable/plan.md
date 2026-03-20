

# Plan: Naprawa nawigacji w nagłówku — scroll do sekcji + obsługa linków

## Problem

1. **Scroll do sekcji nie działa** — przyciski z URL `#eqology`, `#contact` itp. wywołują `document.getElementById()`, ale element nie jest znajdowany, bo sekcje mogą nie mieć ustawionych pasujących `anchor_id`. Handler milcząco zawodzi (nic się nie dzieje).
2. **Linki zewnętrzne/wewnętrzne** — brak obsługi `target="_blank"` dla linków zewnętrznych; zwykłe `<a href>` w kontekście SPA może nie działać prawidłowo.

## Rozwiązanie

### 1. `HeaderSection.tsx` — ulepszyć `handleClick`

Obecny handler sprawdza tylko `document.getElementById(anchor)`. Trzeba go rozbudować:

- Jeśli URL zaczyna się od `#` → szukaj elementu po ID. Jeśli nie znaleziono, spróbuj `querySelector([id*="anchor"])` jako fallback. Dodać mały offset dla sticky headera (`scrollTo` z kalkulacją pozycji minus wysokość headera).
- Jeśli URL jest zewnętrzny (http/https na inną domenę) → `window.open(url, '_blank')` + `e.preventDefault()`
- Jeśli URL jest ścieżką wewnętrzną (np. `/dashboard`) → `window.location.href = url`
- Importować `isExternalUrl` z `@/lib/urlUtils`

### 2. `HeaderSection.tsx` — dodać `target="_blank"` dla linków zewnętrznych

Dla `<a>` tagów renderowanych w nawigacji, ustawić `target="_blank"` i `rel="noopener noreferrer"` gdy URL jest zewnętrzny.

### 3. `HeaderSectionEditor.tsx` — dodać podpowiedź o kotwicach

W sekcji „Elementy nawigacji" dodać małą informację: „Aby link prowadził do sekcji na stronie, wpisz `#` + anchor ID sekcji (np. `#kontakt`). Anchor ID ustawiasz w edytorze każdej sekcji."

## Pliki do zmian

| Plik | Zmiana |
|------|--------|
| `HeaderSection.tsx` | Rozbudować handleClick: fallback scroll, obsługa zewnętrznych linków, offset dla sticky headera |
| `HeaderSectionEditor.tsx` | Dodać tekst pomocniczy w sekcji nawigacji |

