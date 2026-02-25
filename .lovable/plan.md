

## Zmiana reguly 2h -- ukrywanie terminow zamiast oznaczania jako contactOnly

### Obecny stan
Sloty < 2h od teraz sa oznaczane jako `contactOnly: true` i wyswietlane z innym stylem + dialog kontaktowy. Uzytkownik chce je calkowicie ukryc.

### Zmiana

**Plik: `src/components/events/PartnerMeetingBooking.tsx`**

1. W filtrze slotow (linia 433-443) dodac warunek: jesli `slotStartUTC < twoHoursFromNow` to `return false` (ukryj slot)
2. Usunac logike `contactOnly` z `.map()` (linie 448-451, 464) -- pole juz niepotrzebne
3. Usunac dialog kontaktowy (komponent Dialog z emailem/telefonem) i powiazany stan (`showContactDialog`, `contactPartnerInfo`)
4. Usunac obsluge klikniecia slotu contactOnly w `handleSelectSlot` -- teraz kazdy widoczny slot jest rezerwowalny
5. Usunac warunkowe stylowanie slotow contactOnly (opacity, border-dashed, ikona telefonu, tooltip)

**Plik: `src/components/events/PartnerMeetingBooking.tsx` -- interfejs AvailableSlot**

Usunac pole `contactOnly?: boolean` z interfejsu.

### Efekt

Jesli jest 15:01, to sloty 15:00, 16:00 i 17:00 sa ukryte. Najblizszy widoczny termin to 18:00 (pierwszy slot >= 2h od teraz). Zadne sloty "do kontaktu" nie sa wyswietlane.

