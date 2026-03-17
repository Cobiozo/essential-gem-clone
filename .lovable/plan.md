

# Plan: Naprawa przycisku "Zaproś" w widżecie "Moje spotkania"

## Problem

W `MyMeetingsWidget.tsx` funkcja `handleCopyInvitation` generuje link **bez parametru `ref={eq_id}`** partnera. Gość rejestrujący się przez taki link nie zostanie przypisany do żadnego partnera.

**Porównanie:**

| | EventCardCompact (prawidłowy) | MyMeetingsWidget (błędny) |
|---|---|---|
| Base URL | `https://purelife.info.pl` | `window.location.origin` |
| Parametr `ref` | `ref={profile.eq_id}` | **BRAK** |
| Efekt | Gość przypisany do partnera | Gość bez przypisania |

## Naprawa

### Plik: `src/components/dashboard/widgets/MyMeetingsWidget.tsx`

1. Pobrać `eq_id` użytkownika z profilu (zapytanie do `profiles` lub z kontekstu auth, analogicznie jak w `EventCardCompact`)
2. W `handleCopyInvitation` (linie 158-166):
   - Zmienić `baseUrl` na stałe `https://purelife.info.pl`
   - Dodać `ref={eq_id}` do parametrów URL (tak jak w EventCardCompact linia 420)
   - Zachować istniejącą obsługę `lang`

**Zmiana kluczowa** (linie 158-168):
```typescript
// Pobrać eq_id z profilu (jednorazowy fetch lub z kontekstu)
const baseUrl = 'https://purelife.info.pl';
const eventSlug = (event as any).slug;
const eqId = profile?.eq_id; // ← dodać pobranie profilu

let inviteUrl: string;
if (eventSlug) {
  const params = new URLSearchParams();
  if (eqId) params.set('ref', eqId);  // ← DODANE
  if (inviteLang !== 'pl') params.set('lang', inviteLang);
  const qs = params.toString();
  inviteUrl = `${baseUrl}/e/${eventSlug}${qs ? `?${qs}` : ''}`;
} else {
  inviteUrl = `${baseUrl}/events/register/${event.id}${user ? `?invited_by=${user.id}` : ''}`;
}
```

3. Dodać hook/zapytanie do pobrania `eq_id` z tabeli `profiles` (analogicznie do `EventCardCompact` który używa `useProfile` lub bezpośredniego query).

