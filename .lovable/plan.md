## 1. Panel administratora — zwinięty sidebar i start na „Użytkownicy”

Sprawdzone w kodzie:
- `src/pages/Admin.tsx` (linia 321): domyślna zakładka to `content` („Zarządzanie sekcjami”).
- `src/components/admin/AdminSidebar.tsx`: kategoria otwiera się automatycznie, gdy zawiera aktywną pozycję (`openCategoryId === category.id || category.items.some(isNavItemActive)`), więc po wejściu zawsze jedna grupa jest rozwinięta.

Zmiany:
- Domyślna zakładka: `searchParams.get('tab') || 'users'`.
- Sidebar: rozwijanie tylko na podstawie `openCategoryId` (oraz trybu wyszukiwania) — usunięcie automatycznego otwierania po aktywnej pozycji, `openCategoryId` startuje jako `null`. Efekt: po wejściu wszystkie zakładki zwinięte, otwierają się dopiero po kliknięciu.

## 2. Przyciski nawigacji mapy

W `src/components/admin/UserWorldMap.tsx` pasek kontrolek (linia ~724) jest przyklejony do samego rogu i przykrywa atrybucję. Zmiana:
- Powiększenie przycisków (ikony i pola dotykowe ok. 40 px zamiast obecnych małych).
- Przesunięcie paska w lewo od napisu „Leaflet | Tiles © Esri” (offset od prawej krawędzi), tak aby przyciski były **przed** napisem, a nie na nim.

## 3. Brak użytkowników/clusterów na mapie — przyczyna i naprawa

Zweryfikowane w bazie:
- Warunki funkcji `get_user_location_points()` spełnia **96 profili** — dane są, więc problem nie leży po stronie RPC.
- Tabela `city_geocache` ma **153 wpisy**, ale wszystkie z **pustym `postal_code`** (klucz `miasto|kraj`).
- Frontend od ostatniej zmiany dokleja do klucza reprezentatywny kod pocztowy (`miasto|kraj|kod`), więc każde miasto trafia w **cache miss** → wszyscy lądują w „oczekuje na lokalizację” (73 na zrzucie), a cluster nie ma czego pokazać.

Naprawa (tylko frontend, bez migracji):
- Zapytanie o geokodowanie wysyła dla każdego miasta **dwa klucze**: z kodem pocztowym (precyzja przy powtarzających się nazwach miast) i bazowy `miasto|kraj`.
- Przy przypisywaniu współrzędnych: najpierw klucz z kodem pocztowym, przy braku — fallback do bazowego `miasto|kraj` (trafia w istniejący cache 153 miast), a dopiero brak obu = „oczekuje na lokalizację”.
- Fallback także dla profili z pustym krajem: dopasowanie po samym mieście.
- Podbicie wersji klucza `localStorage` cache geokodowania, żeby stare puste wyniki nie blokowały renderu.
- Kod pocztowy używany do rozróżniania miast o tej samej nazwie pozostaje bez zmian; clustry i liczniki w popupach krajów liczone na tej samej, poprawionej liście.

## Szczegóły techniczne
- Pliki: `src/pages/Admin.tsx`, `src/components/admin/AdminSidebar.tsx`, `src/components/admin/UserWorldMap.tsx`.
- Brak zmian w bazie i w Edge Function `geocode-cities` — istniejący cache miast zostaje wykorzystany, brakujące miasta dogeokodują się w tle jak dotąd.
