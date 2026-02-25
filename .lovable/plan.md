

## Naprawa widocznosci terminow + nowe funkcje spotkań

### Problem 1: Dlaczego terminy Sebastiana Snopka sa niewidoczne

**Przyczyna znaleziona**: W `PartnerMeetingBooking.tsx` (linie 292-296) zapytanie o "blokujące wydarzenia platformowe" (webinary, spotkania zespołu) **nie filtruje po host_user_id**. Pobiera WSZYSTKIE webinary z danego dnia i blokuje nimi sloty WSZYSTKICH liderów.

Dzisiaj (25.02.2026) sa dwa webinary:
- "Business Opportunity Meeting - English": 19:00-19:30 UTC = **20:00-20:30 CET**
- "Business Opportunity Meeting - Italian": 20:00-20:30 UTC = **21:00-21:30 CET**

Sebastian ma tripartite slot 21:00-22:00 Europe/Prague (CET). Webinar Italian nakłada sie na 21:00-21:30 wiec slot 21:00 jest blokowany. A to jedyny slot tripartite na ten dzień -- stąd "Available slots: 0".

Dla konsultacji (10:00-15:00 CET) -- te sloty powinny byc widoczne, ale filtr na linie 417 `slotTime <= currentTime` porównuje czas lidera z czasem lokalnym użytkownika. Jeśli oba sa w CET i jest np. 12:00, to sloty 10:00 i 11:00 sa odfiltrowane, ale 12:00-14:00 powinny byc widoczne. Problemem jest brak logiki 2h bufora.

**Naprawa**: Dodac `.eq('host_user_id', partnerId)` do zapytania o blokujace wydarzenia, aby webinary blokowaly sloty TYLKO ich hosta.

### Problem 2: Reguła 2 godzin + dane kontaktowe

**Wymaganie**: 
- Termin jest dostępny do rezerwacji jeśli jest >= 2h od teraz
- Termin < 2h od teraz NIE jest do rezerwacji, ale po kliknięciu pokazuje okienko z emailem i telefonem partnera prowadzącego, aby umożliwić bezpośredni kontakt
- Terminy dzisiejsze mają być widoczne w kalendarzu (nie ukrywane)

**Implementacja**:
- Zmienić filtr w `loadAvailableSlots` -- zamiast ukrywać sloty < currentTime, oznaczyć je jako `contactOnly: true` jeśli są < 2h od teraz
- Dodać nowe pole do interfejsu `AvailableSlot`: `contactOnly?: boolean`
- Sloty `contactOnly` wyświetlać z innym stylem (szary/przyciemniony) i po kliknięciu otwierać dialog z emailem i telefonem partnera zamiast przechodzić do kroku confirm
- Sloty które już minęły (start_time < now) -- nadal ukrywać

**Pliki**:
- `src/components/events/PartnerMeetingBooking.tsx`:
  - Linia 292: dodać `.eq('host_user_id', partnerId)` lub `.in('host_user_id', [partnerId])` do zapytania blocking events (ewentualnie filtrować tylko te gdzie partner jest uczestnikiem)
  - Linie 415-421: zmienić logikę filtrowania -- sloty przeszłe ukrywać, sloty < 2h oznaczać jako contactOnly
  - Dodać pole `contactOnly` do interfejsu `AvailableSlot`
  - Dodać dialog z danymi kontaktowymi partnera (email, telefon) wyświetlany po kliknięciu slotu contactOnly
  - Załadować `phone_number` partnera razem z profilem (linia 130)

### Problem 3: Harmonogram spotkań w Panelu Lidera

**Wymaganie**: W zakładce "Spotkania indywidualne" w Panelu Lidera dodać widok harmonogramu -- lista zarezerwowanych i anulowanych spotkań, pogrupowana po dniach, od najwcześniejszych do najpóźniejszych, z pełnymi danymi (kto zarezerwował, dane prospekta, notatki, typ, status).

**Obecny stan**: Zakładka "Spotkania indywidualne" w LeaderPanel ma dwa pod-taby: "Ustawienia" i "Historia". Historia (IndividualMeetingsHistory) pokazuje tylko przeszłe spotkania z podstawowymi danymi (brak danych prospekta, brak opisu).

**Implementacja**: Nowy komponent `LeaderMeetingSchedule.tsx` -- widok harmonogramu:
- Pobiera WSZYSTKIE spotkania lidera (przyszłe i przeszłe) z tabeli `events` gdzie `host_user_id = user.id` i `event_type IN ('tripartite_meeting', 'partner_consultation')`
- Grupuje je po dniach
- Wyświetla chronologicznie od najwcześniejszych
- Dla każdego spotkania pokazuje:
  - Typ (trójstronne / konsultacje) z ikoną i badge
  - Data i godzina
  - Kto zarezerwował (imię, nazwisko, email)
  - Dane prospekta / cel konsultacji (z pola description -- JSON)
  - Notatki dodatkowe
  - Link Zoom
  - Status: aktywne / anulowane
- Dodać trzecią pod-zakładkę "Harmonogram" w UnifiedMeetingSettingsForm (lub zamienić "Historia" na rozbudowany harmonogram)

**Pliki**:
- `src/components/events/LeaderMeetingSchedule.tsx` -- nowy komponent
- `src/components/events/UnifiedMeetingSettingsForm.tsx` -- dodać zakładkę "Harmonogram" obok "Ustawienia" i "Historia"

---

### Podsumowanie zmian

| Plik | Zmiana |
|------|--------|
| `src/components/events/PartnerMeetingBooking.tsx` | 1) Fix: dodać filtr host_user_id do blocking events query, 2) Reguła 2h: sloty < 2h oznaczać jako contactOnly zamiast ukrywać, 3) Dialog kontaktowy z emailem/telefonem partnera, 4) Pobrać phone_number partnera |
| `src/components/events/LeaderMeetingSchedule.tsx` | Nowy komponent: harmonogram spotkań lidera pogrupowany po dniach z pełnymi danymi |
| `src/components/events/UnifiedMeetingSettingsForm.tsx` | Dodać zakładkę "Harmonogram" |
