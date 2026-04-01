

# Naprawa błędu: useNavigate() poza kontekstem Router

## Problem
`MFAChallenge` jest renderowany w bloku MFA gate (linia 354-361 w `App.tsx`) **bez** `<BrowserRouter>`. Dodanie `useNavigate()` w ostatniej zmianie powoduje crash: *"useNavigate() may be used only in the context of a Router component"*.

## Rozwiązanie

### Opcja A (prosta, zalecana): Zamienić `useNavigate` na `window.location.href`

W `MFAChallenge.tsx`:
- Usunąć import i wywołanie `useNavigate`
- W handlerze "Porzuć i wyloguj" użyć `window.location.href = '/auth'` zamiast `navigate('/auth', { replace: true })`

To jedyna zmiana — 3 linie w jednym pliku.

### Dlaczego nie opakowywać w BrowserRouter?
MFA gate celowo blokuje dostęp do routera. Dodanie BrowserRouter tylko dla jednego przycisku to nadmierna zmiana architektury.

## Plik do edycji

| Plik | Zmiana |
|------|--------|
| `src/components/auth/MFAChallenge.tsx` | Usunąć `useNavigate`, zamienić na `window.location.href = '/auth'` |

