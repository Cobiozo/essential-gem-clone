## Zmiana etykiet: "Zdrowa Wiedza" → "Baza Wiedzy"

Moduł został przemianowany, ale w zakładce "Moje konto" pozostały stare nazwy. Zmieniam tylko widoczne teksty (frontend), bez zmian w logice ani bazie danych.

### Zmiany

**1. `src/pages/MyAccount.tsx` (linia 675)**
- Zakładka: `Moje kody ZW` → `Moje kody BW`

**2. `src/components/healthy-knowledge/MyHkCodesHistory.tsx` (linie 233–234)**
- Tytuł karty: `Moje kody Zdrowej Wiedzy` → `Moje kody Bazy Wiedzy`
- Opis: `Historia wygenerowanych kodów dostępu` — bez zmian (już neutralny)

### Poza zakresem
- Nie ruszam prefixu kodów `BW-XXXX` (już jest poprawny).
- Nie zmieniam nazw plików/komponentów ani tabel (`healthy_knowledge`, `hk_otp_codes`) — tylko warstwa prezentacji.
- Jeśli chcesz, żebym poszukał także innych miejsc w aplikacji z tekstem „Zdrowa Wiedza" (np. menu, powiadomienia, e-maile, szablony wiadomości OTP w 4 językach), daj znać — zrobię to jako osobny krok.
