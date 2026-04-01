

# Dodanie przycisku "Porzuć i wyloguj" na ekranie MFA

## Zmiana

Dodać mały przycisk "Porzuć i wyloguj" pod istniejącymi opcjami na ekranie weryfikacji MFA (`MFAChallenge.tsx`). Po kliknięciu:
1. Wywołuje `supabase.auth.signOut()`
2. Przekierowuje na `/auth`

Przycisk będzie zawsze widoczny (niezależnie od metody MFA), mniejszy i mniej wyrazisty niż pozostałe, z ikoną `LogOut`.

## Plik do edycji

| Plik | Zmiana |
|------|--------|
| `src/components/auth/MFAChallenge.tsx` | Dodanie przycisku `variant="ghost" size="sm"` z `LogOut` ikoną tuż przed `</CardContent>`, wywołującego `signOut()` + `navigate('/auth')` |

## Szczegol techniczny

- Import `useNavigate` z react-router-dom i `LogOut` z lucide-react
- Handler: `await supabase.auth.signOut(); navigate('/auth', { replace: true });`
- Tekst: `tf('mfa.abandonAndLogout', 'Porzuć i wyloguj')` (z fallbackiem PL)
- Styl: `text-muted-foreground hover:text-destructive`, oddzielony separatorem lub dodatkowym marginesem od przycisków powyżej

