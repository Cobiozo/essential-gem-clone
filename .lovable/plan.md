
# Problem: Użytkownicy nie potwierdzają emaila — analiza i plan naprawy

## Stan faktyczny (po przeanalizowaniu kodu i bazy)

### Co wysyłamy i co dociera

Wszystkie 4 osoby (Dominika, Kamila, Elżbieta, Jerzy) **otrzymały email aktywacyjny** — SMTP potwierdził dostawę, brak błędów w `email_logs`. Domeny: gmail.com, hotmail.com, badzbardziej.pl — maile prawdopodobnie dotarły.

Problem leży gdzie indziej: **użytkownicy nie kliknęli w link aktywacyjny**, więc `profiles.email_activated` pozostaje `false`. Mogli:
- Zignorować email
- Nie zobaczyć (SPAM)
- Zamknąć zakładkę po rejestracji bez czytania emaila

### Dlaczego Supabase Auto Confirm jest włączone?

```
email_confirmed_at - created_at = 0.136s  (wszystkie konta)
confirmation_sent_at = NULL                (Supabase nie wysyła własnego maila)
```

To jest **celowe ustawienie** — projekt używa własnego SMTP zamiast Supabase email. Supabase Auto Confirm jest włączone żeby Supabase nie blokowało rejestracji własnym emailem weryfikacyjnym. Zamiast tego aplikacja wysyła własny email przez `send-activation-email` i śledzi kliknięcie przez `email_activated` w `profiles`.

**To jest poprawna architektura.** Problem nie w Auto Confirm, tylko w tym że użytkownicy nie klikają linku.

### Obecna blokada (co już działa)

- Opiekun w `TeamContactsTab` → przycisk "Zatwierdź" jest **disabled** gdy `email_activated = false` ✅
- Funkcja `guardian_approve_user()` w bazie **rzuca wyjątek** gdy email niepotwierdzony ✅
- `ApprovalStatusBanner` pokazuje banner oczekiwania na opiekuna/admina ✅

### Co brakuje — przepływ oczekiwania na email

`ApprovalStatusBanner` sprawdza tylko `guardian_approved` i `admin_approved`, ale **pomija `email_activated`**. Użytkownik który się zaloguje przed kliknięciem linku widzi "Oczekuj na opiekuna" — bez jasnej informacji że musi NAJPIERW potwierdzić email.

Poza tym brak przycisku "Wyślij ponownie email aktywacyjny" w bannerze dla niezalogowanego.

## Co należy naprawić

### 1. ApprovalStatusBanner — dodać krok "Potwierdź email"

Dodać nowy przypadek jako **Przypadek 0** (przed oczekiwaniem na opiekuna):

```
Jeśli !profile.email_activated → pokaż baner "Potwierdź adres email"
```

Banner powinien zawierać:
- Komunikat "Sprawdź skrzynkę odbiorczą i kliknij w link aktywacyjny"
- Adres email na który wysłano link
- Przycisk "Wyślij ponownie email aktywacyjny" (wywołujący `send-activation-email` z `resend: true`)
- Link do SPAM folder (jako podpowiedź)

### 2. Ręczna naprawa 4 użytkowników w panelu admin

W `CompactUserCard` w panelu admin istnieje już przycisk potwierdzenia emaila `admin_confirm_user_email`. Należy go uwidocznić dla użytkowników gdzie `email_activated = false`.

Sprawdzamy — w `src/pages/Admin.tsx` linia 494:
```typescript
email_activated: row.email_activated ?? !!row.email_confirmed_at,
```
To **fallback** który powoduje że użytkownik z `email_confirmed_at` (Auto Confirm) pokazuje się jako `email_activated: true` nawet gdy `profiles.email_activated = false`! To błąd — zakrywa problem.

Należy usunąć ten fallback: `email_activated: row.email_activated` (bez `??`).

### 3. SQL — naprawa 4 istniejących użytkowników

Admin może naprawić ręcznie przez `admin_confirm_user_email` w panelu. Ale żeby te osoby pokazały się jako "niepotwierdzony email" (nie ukryte przez fallback), trzeba naprawić punkt 2 powyżej.

Alternatywnie: dodać przycisk "Potwierdź email ręcznie" bezpośrednio przy każdym użytkowniku z `email_activated = false` w `CompactUserCard`.

## Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `src/components/profile/ApprovalStatusBanner.tsx` | Dodanie Case 0: baner "Potwierdź email" z przyciskiem ponownego wysyłania |
| `src/pages/Admin.tsx` | Usunięcie błędnego fallback `?? !!row.email_confirmed_at` dla `email_activated` |

## Brak zmian w

- Logice wysyłki emaili (działa poprawnie)
- Supabase Auth (Auto Confirm ma pozostać włączone — to celowe)
- Bazie danych (nie potrzeba migracji)
- Edge Functions

## Efekt po zmianie

1. Użytkownicy którzy zarejestrowali się ale nie kliknęli linku zobaczą baner "Potwierdź email" z przyciskiem ponownego wysyłania — zamiast mylącego "Oczekuj na opiekuna"
2. Admin w panelu widzi rzeczywisty status `email_activated` (bez błędnego fallback) i może ręcznie potwierdzić email dla 4 problemowych osób
3. Przepływ jest jasny: Email → Opiekun → Admin → Dostęp
