
# Dodanie przycisku "Ponów wysłanie email aktywacyjnego" dla użytkowników oczekujących

## Cel

Administratorzy mają widzieć przy każdym użytkowniku ze statusem "X Email" (niepotwierdzony email) dodatkowy przycisk umożliwiający ponowne wysłanie wiadomości aktywacyjnej. Kliknięcie go wywoła funkcję `send-activation-email` z parametrem `resend: true`, tak jak robi to już strona rejestracji.

## Diagnoza obecnego stanu

**Aktualny przycisk Mail** (linie 344-362 w `CompactUserCard.tsx`):
- Istnieje przycisk z ikoną `<Mail />`, pokazywany gdy `needsEmailConfirm = true`
- Wywołuje `onConfirmEmail(userProfile.user_id)` — co odpala RPC `admin_confirm_user_email` (ręczne potwierdzenie bez wysyłki emaila)
- Brakuje opcji **ponownego wysłania emaila aktywacyjnego** do użytkownika

**Edge Function `send-activation-email`** (już istnieje i działa):
- Obsługuje parametr `resend: true` — pomija ochronę przed duplikacją
- Generuje nowy link aktywacyjny i wysyła email przez SMTP
- Przyjmuje: `userId`, `email`, `firstName`, `lastName`, `role`, `resend`

## Zmiany

### 1. `src/components/admin/CompactUserCard.tsx`

**Dodanie nowego propa i stanu:**
- Nowy prop `onResendActivationEmail: (userId: string, email: string, firstName?: string, lastName?: string, role?: string) => void`
- Lokalny stan `isSendingActivation: boolean` do pokazania loadera podczas wysyłki

**Zmiana wyglądu sekcji "Confirm email" (linie 343-362):**
- Obecny przycisk Mail (zielona obwódka) — zmienić tooltip z "Potwierdź email" na "Potwierdź email (ręcznie)" — pozostaje bez zmian
- Dodać nowy przycisk **"Wyślij email aktywacyjny"** z ikoną `<Send />` obok istniejącego przycisku Mail, widoczny tylko gdy `needsEmailConfirm = true`
- Przycisk ma kolor pomarańczowy/amber (nawiązanie do statusu oczekiwania) i tooltip: "Wyślij email aktywacyjny ponownie"
- Podczas wysyłki pokazuje spinner (`Loader2` animowany)

```
[Więcej] [Zatwierdź] [✉ Wyślij aktywację] [✓ Email manualnie] [✏] [...]
```

### 2. `src/pages/Admin.tsx`

**Nowa funkcja `resendActivationEmail`:**
```typescript
const resendActivationEmail = async (userId, email, firstName, lastName, role) => {
  // Wywołuje supabase.functions.invoke('send-activation-email', {
  //   body: { userId, email, firstName, lastName, role, resend: true }
  // })
  // Toast success/error
  // Bez odświeżania listy (status email_activated nie zmienia się po wysyłce)
}
```

**Przekazanie nowego propa do `CompactUserCard`:**
```tsx
<CompactUserCard
  ...
  onResendActivationEmail={resendActivationEmail}
/>
```

## Wizualne rozmieszczenie przycisków

Przy użytkowniku z `X Email` (oba przyciski obok siebie):

```
[Więcej] [Zatwierdź] | [📧 Wyślij aktywację] [✉ Potwierdź manualnie] | [✏] [⋯]
```

- `📧 Wyślij aktywację` — amber/pomarańczowy, wysyła email przez SMTP
- `✉ Potwierdź manualnie` — zielony, RPC potwierdza bez emaila (dla sytuacji gdy email dotarł ale link nie działa)

## Podsumowanie plików

| Plik | Zmiana |
|------|--------|
| `src/components/admin/CompactUserCard.tsx` | Nowy prop `onResendActivationEmail`, nowy przycisk `<Send />` z loaderem, tooltip wyjaśniający różnicę |
| `src/pages/Admin.tsx` | Nowa funkcja `resendActivationEmail` wywołująca edge function, przekazanie propa do `CompactUserCard` |

Nie są potrzebne zmiany w Edge Function ani bazie danych — `send-activation-email` obsługuje już `resend: true`.
