## Plan

1. **Panel „Twoje bilety na to wydarzenie” zawsze widoczny dla zalogowanego użytkownika**
   - Zmienić `MyEventTicketsInline`, żeby nie zwracał `null`, gdy nie ma zamówień.
   - Panel ma zawsze pokazywać nagłówek i licznik: `0 biletów`, jeśli użytkownik nie ma jeszcze zamówienia.
   - Jeśli są zamówienia, panel pokaże wszystkie bilety/uczestników: kupującego oraz gościa, np. `rere tete`.
   - Dodać stan ładowania i stan pusty zamiast ukrywania całej zakładki.

2. **Panel „Pokaż zapisanych przez mój link” zawsze widoczny przy linku partnerskim**
   - Zmienić `MyEventFormLinks`, żeby przy istniejącym linku zawsze renderował przycisk/zakładkę `Pokaż zapisanych przez mój link (0)` — nawet gdy nie ma nikogo zapisanego.
   - Po rozwinięciu przy `0` ma pokazywać komunikat `Brak zapisanych przez Twój link.`.
   - Licznik dalej ma wykluczać własną rejestrację użytkownika.

3. **Własna rejestracja nie trafia do poleconych**
   - Zachować i wzmocnić filtrowanie w `MyEventFormReferrals`: własny email użytkownika nie może pojawić się w tabeli zapisanych przez mój link.
   - Dane własnego zamówienia mają być prezentowane tylko w panelu biletów.

4. **Testy regresji**
   - Dodać konfigurację testów dla Vitest + React Testing Library, jeśli jej jeszcze nie ma.
   - Dodać test dla `MyEventTicketsInline`, który sprawdza, że zamówienie na 2 miejsca pokazuje kupującego i gościa `rere tete` oraz status płatności.
   - Dodać test dla pustego stanu panelu biletów: panel widoczny z licznikiem `0`, a nie ukryty.
   - Dodać test dla `MyEventFormLinks`/`MyEventFormReferrals`, który sprawdza, że własna rejestracja nie jest liczona ani wyświetlana w „Pokaż zapisanych przez mój link”, a osoby z innym emailem są widoczne.
   - Dodać test, że przy braku poleconych zakładka pokazuje `Pokaż zapisanych przez mój link (0)` i pusty komunikat.

## Technicznie

- Zmieniane pliki: `src/components/paid-events/MyEventTicketsInline.tsx`, `src/components/paid-events/MyEventFormLinks.tsx`, `src/components/paid-events/MyEventFormReferrals.tsx`.
- Nowe pliki testowe: przy komponentach albo w `src/test`, zgodnie z istniejącą strukturą projektu.
- Konfiguracja: `vitest.config.ts`, `src/test/setup.ts`, aktualizacja `package.json` i `tsconfig.app.json`, jeśli potrzebne.