## Cel

1. Naprawić błąd „Edge Function returned a non-2xx status code" przy rezerwacji biletu przelewem przez zalogowanego partnera.
2. Zmienić układ tekstu na stronie potwierdzenia e-maila dla bezpłatnej rejestracji gościa.

---

## 1. Błąd rezerwacji biletu przelewem

### Diagnoza
- Wydarzenie „Kompleksowe szkolenie TEST" ma `is_free = true` i wszystkie flagi `payment_method_* = false` na poziomie wydarzenia.
- Bilet „REZERWUJĘ BILET" (id `95e0f9a9...`) ma własne `payment_method = 'transfer'`, cenę 20 zł oraz wypełnione `transfer_payment_details`.
- Frontend (`PurchaseDrawer`) poprawnie wykrywa `transferOnly = true` i wywołuje funkcję `register-event-transfer-order`.
- Funkcja w repo (linie 350–358) już zawiera „ticket-level override" (`ticketForcesTransfer`), który powinien przepuścić to żądanie.
- Wykonany testowy `curl` do funkcji zwraca jednak `400 {"error":"transfer_disabled"}`. To oznacza, że **wdrożona wersja edge functiona nie zawiera jeszcze ostatniej poprawki** (override per bilet) — kod w repo jest poprawny, ale build/deploy nie został przepchnięty.

### Działanie
- Ponowne wdrożenie funkcji `register-event-transfer-order` (re-deploy), aby działała logika `ticketForcesTransfer`.
- Po wdrożeniu wykonać kontrolny `curl` z tym samym ticketId — oczekiwany wynik: `200 {success:true,orderId,ticketCode}` zamiast `400 transfer_disabled`.
- Bez zmian w kodzie źródłowym funkcji (jest już prawidłowy).
- Bez zmian w `PurchaseDrawer.tsx` — flow „Rezerwuję" i komunikat sukcesu już istnieją.

### Efekt
- Zalogowany partner po kliknięciu **„Rezerwuję"** dostanie toast „Rezerwacja przyjęta" + e-mail z danymi do przelewu (z brandowanego SMTP, z bannerem wydarzenia, danymi konta i kodem QR po zaksięgowaniu).

---

## 2. Strona potwierdzenia e-maila — wariant bezpłatny (gość)

Plik: `src/pages/EventFormConfirmPage.tsx`, blok renderowany gdy `state === 'ok' | 'already'` i `isFree === true`.

### Aktualny układ (do zmiany)
```
✓
Twoje dane i rejestracja zostały poprawnie potwierdzone
Na wskazany adres e-mail otrzymasz bilet... Dziękujemy i do zobaczenia na wydarzeniu.
```
(jeden akapit, brak hierarchii, brak osobnego stopki „dziękujemy")

### Nowy układ
```
✓
Twoje dane i rejestracja zostały poprawnie potwierdzone   ← nagłówek (bez zmian)

Następnie otrzymasz e-mail wraz z biletem uprawniającym
do uczestnictwa w wydarzeniu.                              ← mniejsza czcionka, text-sm, text-muted-foreground

Dziękujemy i do zobaczenia na wydarzeniu!                  ← osobny akapit na dole, text-sm, lekki odstęp pt-2
```

### Co konkretnie zrobić w kodzie
- W gałęzi `isFree` zastąpić obecny jeden `<p>` dwoma akapitami:
  - pierwszy: klasy `text-sm text-muted-foreground leading-relaxed`, treść: „Następnie otrzymasz e-mail wraz z biletem uprawniającym do uczestnictwa w wydarzeniu."
  - drugi: klasy `text-sm text-muted-foreground pt-2`, treść: „Dziękujemy i do zobaczenia na wydarzeniu!"
- Płatny wariant (przelew) zostaje bez zmian.
- Brak zmian w funkcji `confirm-event-form-email` ani w mailach.

---

## Weryfikacja po wdrożeniu

1. Zalogowany partner → wybiera bilet „REZERWUJĘ BILET" (20 zł, przelew) → klika **„Rezerwuję"** → pojawia się banner sukcesu, w skrzynce e-mail z danymi do przelewu.
2. Gość → wybiera bilet bezpłatny → potwierdza e-mail → strona pokazuje nowy 3-warstwowy układ („potwierdzone" → mała informacja o bilecie → „dziękujemy").
