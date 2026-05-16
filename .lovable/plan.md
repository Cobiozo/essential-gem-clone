…
## Zakres

Dokończenie dwóch pozostałych zadań z poprzedniej iteracji:

### 1) Pasek statusu na mapie świata (`UserWorldMap.tsx`)
- Pod mapą dodać pasek statusu pokazujący postęp geokodowania:
  - „Zlokalizowano X / Y miast"
  - Gdy `pending > 0`: dopisek „Geokoduję w tle: N miast…" + mały spinner
  - Gdy `pending === 0` i są błędy: „Nie udało się zlokalizować: N" z tooltipem listy
- Dane bierzemy z odpowiedzi `geocode-cities` (pola `located`, `missing`, `pending`), które już są zwracane.
- Auto-odświeżanie co 5s już działa przez `refetchInterval` — pasek zniknie/zmieni stan automatycznie.

### 2) Fallback kraju z `city_geocache.display_country` (`UserStatistics.tsx`)
- W agregatorze statystyk krajów: jeżeli `profile.country` jest puste/„Nieznane", użyj `city_geocache.display_country` dopasowanego po znormalizowanym `city`.
- Pobranie jednorazowe: `select city, display_country from city_geocache where display_country is not null`.
- Budujemy mapę `cityLower -> display_country` i używamy jej w `normalizeCountry` jako fallback przed zwróceniem „Nieznane".
- Dotyczy zarówno listy krajów w statystykach, jak i grupowania miast na mapie (spójność z `UserWorldMap`).

## Pliki
- `src/components/admin/UserWorldMap.tsx` — pasek statusu pod mapą.
- `src/components/admin/UserStatistics.tsx` — query do `city_geocache` + fallback w agregacji krajów.

Bez zmian w bazie i edge functions.
