

# Śledzenie gości auto-webinaru — kto dołączył, kiedy i jak długo

## Obecny stan

| Element | Status |
|---|---|
| Rejestracja gościa (email, imię, slot_time) | ✅ `guest_event_registrations` |
| Tracking sesji oglądania | ✅ `auto_webinar_views` (czas, długość) |
| **Powiązanie rejestracji z sesją oglądania** | ❌ **Brak** — views nie wie kim jest gość |

## Proponowane rozwiązanie: email w URL + automatyczne powiązanie

Zamiast prosić gościa o ponowne wpisywanie emaila (ryzyko porzucenia), **dodamy email jako zaszyfrowany parametr w linku** wysyłanym w emailu potwierdzającym.

### Jak to działa:

1. **Rejestracja** → gość podaje email, system zapisuje `guest_event_registrations`
2. **Email z linkiem** → link zawiera `?slot=14:00&ref=BASE64(email)` 
3. **Strona publiczna** → odczytuje `ref` z URL, dekoduje email
4. **Tracking** → `auto_webinar_views` zapisuje `guest_email` + `guest_registration_id` obok sesji

```text
Flow:
Rejestracja → Email z linkiem (?ref=am9obkB...) → Strona /a-w/slug
                                                       ↓
                                              Dekoduj email z URL
                                                       ↓
                                         auto_webinar_views.guest_email = "john@..."
                                         auto_webinar_views.guest_registration_id = UUID
```

### Zmiana 1: Migracja SQL — nowe kolumny w `auto_webinar_views`

```sql
ALTER TABLE auto_webinar_views 
  ADD COLUMN guest_email TEXT,
  ADD COLUMN guest_registration_id UUID REFERENCES guest_event_registrations(id);
```

### Zmiana 2: Link w emailu (`send-webinar-confirmation`)

Przy budowaniu `roomLink` dodać parametr `&ref=` z base64-encoded emailem:

```typescript
const refParam = Buffer.from(email).toString('base64url');
const roomLink = `https://purelife.info.pl/a-w/${slug}?slot=${slotTime}&ref=${refParam}`;
```

### Zmiana 3: Strona publiczna (`AutoWebinarPublicPage.tsx`)

Odczytać `ref` z URL i przekazać do `AutoWebinarEmbed`:

```tsx
const guestRef = searchParams.get('ref');
const guestEmail = guestRef ? atob(guestRef) : null;
// ...
<AutoWebinarEmbed isGuest guestSlotTime={guestSlotTime} guestEmail={guestEmail} />
```

### Zmiana 4: `AutoWebinarEmbed.tsx` + `useAutoWebinarTracking.ts`

- Dodać prop `guestEmail` do `AutoWebinarEmbed`
- Przekazać `guestEmail` do `useAutoWebinarTracking`
- W `createView()`:
  - Zapisać `guest_email` w `auto_webinar_views`
  - Wyszukać `guest_registration_id` po emailu i `slot_time` w `guest_event_registrations`

### Zmiana 5: Panel admina — widok statystyk

Nowa sekcja/tabela w panelu admina auto-webinaru pokazująca:
- Lista zarejestrowanych gości z kolumnami: Imię, Email, Slot, Dołączył?, Czas oglądania
- Dane pobierane z JOIN `guest_event_registrations` + `auto_webinar_views`

## Pliki do modyfikacji

| Plik | Zmiana |
|---|---|
| **Migracja SQL** | Nowe kolumny `guest_email`, `guest_registration_id` w `auto_webinar_views` |
| `supabase/functions/send-webinar-confirmation/index.ts` | Dodanie `&ref=` do linku |
| `src/pages/AutoWebinarPublicPage.tsx` | Odczyt `ref` param, przekazanie `guestEmail` |
| `src/components/auto-webinar/AutoWebinarEmbed.tsx` | Nowy prop `guestEmail`, przekazanie do tracking |
| `src/hooks/useAutoWebinarTracking.ts` | Zapis `guest_email` + lookup `guest_registration_id` |
| `src/components/admin/` (nowy lub istniejący) | Widok statystyk gości auto-webinaru |

## Bezpieczeństwo

- Base64 emaila w URL nie jest "szyfrowaniem" — ale w kontekście auto-webinaru to wystarczające (link i tak jest jednorazowy, wygasa po `link_expiry_minutes`)
- RLS na `auto_webinar_views` pozwala na INSERT anonimowy (gość nie jest zalogowany)
- Dane statystyczne dostępne tylko dla admina

