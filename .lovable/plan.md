## Cel

Gdy zalogowany użytkownik jest już zarejestrowany na dane wydarzenie i otwiera „Kup bilet", drawer NIE powinien pokazywać pól „Dane kupującego" z autouzupełnianiem. Zamiast tego ma wyświetlić wyraźną informację, że użytkownik jest już zarejestrowany, a kolejne bilety będą przypisane gościom (uczestnikom), których chce zaprosić.

## Zmiany w `src/components/paid-events/public/PurchaseDrawer.tsx`

1. **Ukrycie sekcji „Dane kupującego"** gdy `hasOwnTicket === true`:
   - Cały blok `<div className="space-y-3">` z polami Imię/Nazwisko/Email/Telefon (linie ~367–391) renderowany tylko gdy `!hasOwnTicket`.
   - Dane kupującego nadal wypełniane automatycznie z `profile`/`user` w istniejącym `useEffect` (linie 106–115) — wysyłane cicho do backendu, aby `buildPayload()` i `validate()` działały bez zmian.

2. **Wzmocnienie istniejącego komunikatu** (linie 304–311):
   - Zmiana treści na: „Jesteś już zarejestrowany na to wydarzenie. Kolejne bilety zostaną przypisane gościom (uczestnikom), których chcesz zaprosić. Uzupełnij ich dane poniżej lub zrób to później w sekcji „Moje bilety"."
   - Wizualnie bardziej widoczny (ikona CheckCircle2 + mocniejszy border).

3. **Walidacja** (`validate()`, linie 155–166):
   - Gdy `hasOwnTicket`, pominąć sprawdzanie `firstName/lastName/email` (już są z profilu) — nadal wymagać `acceptTerms`.
   - Dodatkowo: wymagać przynajmniej imienia i nazwiska dla każdego gościa (attendee), żeby nie zapisywać pustych biletów.

4. **Liczba biletów / opis płatności** — bez zmian. Gość-tylko-tryb (`buyerIsAttendee = false`) już działa poprawnie z istniejącej logiki.

## Bez zmian

- `MyEventTicketsInline.tsx` (panel „Twoje bilety")
- Edge functions / RLS / schemat bazy
- Cache invalidation po płatności

## Uwagi

Tryb anonimowy (niezalogowany) nie jest dotknięty — `hasOwnTicket` wymaga `user?.id`, więc dla gości formularz „Dane kupującego" pokazuje się jak dotąd.