## Cel

Gdy wydarzenie ma włączony tryb **bezpłatne (rezerwacja + potwierdzenie email)**, drawer zakupu ma działać jako formularz rezerwacji — bez cen, bez komunikatu „Sprzedaż wyłączona", z prawidłowym wysłaniem rezerwacji (a nie tworzeniem płatnego zamówienia).

## Zmiany

### 1. `PaidEventPage.tsx`
Przekaż flagę `isFree` do `PurchaseDrawer`:
```
isFree={(event as any).is_free ?? false}
```

### 2. `PurchaseDrawer.tsx`

**Props:** dodaj `isFree?: boolean`.

**Logika „noMethods":**
```
const noMethods = !isFree && !paymentMethodPayu && !paymentMethodTransfer && !paymentMethodPaypal;
```
W trybie free komunikat „Sprzedaż biletów jest aktualnie wyłączona…" znika.

**Nagłówek (DrawerTitle):**
- free → `'Zarezerwuj miejsce'`
- płatne → `'Kup bilet'` (bez zmian)

**Podsumowanie zamówienia (bg-muted blok):**
- w trybie free **ukryj** sekcję cen: „Cena za bilet", „Bilety (n): n × …", „Do zapłaty", podpowiedź o aktualizacji kwoty.
- Zostaw: nazwę biletu (label „Rezerwacja:"), selektor liczby miejsc (label „Liczba miejsc"), info o `seats_per_ticket`.

**Sekcja przelewu/PayU:** automatycznie zniknie (warunki na `paymentMethodTransfer` / `paymentMethodPayu` — w trybie free są false).

**CTA (DrawerFooter):**
- free → przycisk „Zarezerwuj miejsce" (ikona `CheckCircle2` lub `Mail`), wywołuje nową ścieżkę submit (poniżej).
- płatne → bez zmian („Przejdź do płatności").

**Handler submit dla free:**
- Wywołaj edge function `register-free-event-order` z payloadem analogicznym do `buildPayload()` (eventId, ticketId, quantity, buyer, attendees, buyerIsAttendee, acceptMarketing, refCode).
- Po sukcesie: zamknij drawer i pokaż toast „Sprawdź skrzynkę email — wyślij potwierdzenie rezerwacji" (link aktywacyjny). NIE nawiguj do `/checkout/...`.
- Błędy: standardowy toast jak w `handleSubmit`.

**Walidacja:** bez zmian — formData (imię/nazwisko/email) i regulamin są wymagane także dla rezerwacji.

### 3. Bez zmian w bazie / edge functions
Edge function `register-free-event-order` oraz strona `FreeEventConfirmPage` już istnieją (z poprzedniego kroku). Nie ruszamy `create-event-order` ani migracji.

## Pliki

- `src/pages/PaidEventPage.tsx` (1 linijka — prop `isFree`)
- `src/components/paid-events/public/PurchaseDrawer.tsx` (props, warunkowe UI, drugi handler submit)
