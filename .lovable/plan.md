## Problem

Po wykryciu, że użytkownik jest już zarejestrowany (`hasOwnTicket === true`), formularz „Dane kupującego" jest ukrywany, ale `formData` (firstName/lastName/email/phone) jest wciąż wypełniane przez `useEffect` autouzupełnienia (linie 106–115). To znaczy, że dane kupującego nadal lecą w `buildPayload().buyer` — co przy nieuwadze może doprowadzić do ponownej rejestracji tej samej osoby.

## Zmiany w `src/components/paid-events/public/PurchaseDrawer.tsx`

1. **Autouzupełnianie pomija buyera, gdy `hasOwnTicket`** (useEffect, linie 106–115):
   - Jeśli `hasOwnTicket === true`, NIE wypełniać `firstName/lastName/email/phone` z profilu.
   - Jeśli wcześniej (przed sprawdzeniem) zostały wypełnione, wyczyścić je natychmiast po wykryciu rejestracji.

2. **Reaktywne czyszczenie po wykryciu** — nowy `useEffect` zależny od `hasOwnTicket`:
   ```ts
   useEffect(() => {
     if (hasOwnTicket) {
       setFormData(prev => ({ ...prev, firstName: '', lastName: '', email: '', phone: '' }));
     }
   }, [hasOwnTicket]);
   ```

3. **`buildPayload()` w trybie „guest-only"** (linie 168–199):
   - Gdy `hasOwnTicket`, pole `buyer` ustawiane wyłącznie z `user.email` / `profile` (bez wartości z formularza), wyłącznie do powiązania zamówienia z kontem użytkownika i wysłania emaila potwierdzającego do nabywcy.
   - `attendees` zawiera WYŁĄCZNIE gości — bez kupującego (`buyerIsAttendee = false` już to zapewnia).

4. **Walidacja** (`validate()`):
   - W trybie `hasOwnTicket` wymagać tylko `acceptTerms` i danych każdego gościa (imię + nazwisko). Pomija sprawdzanie `formData.firstName/lastName/email`.
   - Wymagać też, żeby `guestSeatsCount > 0` — w przeciwnym razie nie ma kogo zarejestrować (UI: zablokować przyciski płatności i pokazać hint „Dodaj przynajmniej jednego gościa lub zwiększ liczbę biletów").

5. **Bez zmian**: edge functions, RLS, schemat bazy, `MyEventTicketsInline.tsx`.

## Uwagi

Tryb anonimowy / niezalogowany pozostaje bez zmian — `hasOwnTicket` wymaga `user?.id`.