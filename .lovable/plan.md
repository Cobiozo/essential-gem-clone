## Cel
Po kliknięciu w kraj ma być zaznaczone wyłącznie kliknięte terytorium, bez dodatkowych obszarów z innych części mapy. Zoom po kliknięciu ma być dużo bliższy — dla Polski efekt ma odpowiadać screenowi, czyli kraj ma wypełniać większość okienka widżeta.

## Plan zmian

1. **Precyzyjne rozpoznawanie kraju po kliknięciu**
   - Zamiast opierać zaznaczenie wyłącznie na `normalizeCountry(name).iso`, dodam stabilny identyfikator konkretnej geometrii z `world-atlas`.
   - Kliknięcie we Francję zaznaczy tylko tę konkretną geometrię, którą użytkownik kliknął, a nie inne terytoria/rekordy pasujące do tego samego kraju.
   - Filtrowanie punktów użytkowników nadal zostanie po kraju (`iso`), żeby markery użytkowników dla wybranego kraju działały jak dotychczas.

2. **Zaznaczenie tylko klikniętego terytorium**
   - Render krajów będzie porównywał `selectedCountryKey` z kluczem klikniętej ścieżki.
   - Dzięki temu dodatkowe terytoria nie dostaną żółtego/aktywnego obrysu.
   - Pozostałe kraje będą tylko przygaszone albo neutralne, bez zalania kolorem.

3. **Bliższy zoom kraju po kliknięciu**
   - Zmieniam wyliczenie zoomu dla kraju tak, aby docelowo był około `9x` bliżej dla typowych krajów europejskich, zgodnie z przykładem Polski.
   - Zamiast obecnego dopasowania z dużym marginesem użyję ciaśniejszego kadrowania: kraj ma wypełnić prawie całe okno mapy.
   - Zachowam clamp i walidację `isFinite`, żeby mapa nie mogła wejść w niestabilny stan.

4. **Reset i ponowne kliknięcie**
   - Drugie kliknięcie w ten sam kraj/terytorium odznaczy wybór i wróci do domyślnego widoku.
   - Przycisk resetu będzie czyścił zarówno `selectedIso`, jak i nowy `selectedCountryKey`.

## Technicznie
- Zmiany tylko w `src/components/admin/UserWorldMap.tsx`.
- Nie zmieniam backendu, RLS, ustawień widgetu ani logiki pobierania markerów.
- Nie przywracam fillu kraju w trybie satelitarnym, żeby nie wrócił błąd z żółtą mapą na iOS.
- Dodam identyfikator geometrii kraju do `countryPaths` i przekażę go do `handleCountryClick`.

## Efekt
Kliknięcie w Francję, Polskę lub dowolny inny kraj zaznacza tylko kliknięte terytorium i robi bliski zoom tak, aby wybrany kraj zajmował prawie całe okienko widżeta.