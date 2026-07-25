## Co jest nie tak (zweryfikowane w bazie i kodzie)

1. **„Austria — 4 użytkowników", a widać 1 znacznik.** Popup kraju liczy wszystkich użytkowników z danego kraju (`countryCountsRef` na podstawie surowej listy), a znaczniki powstają tylko dla adresów, które udało się zgeokodować. W bazie Austria ma 4 profile (Wien x3, Wiener Neustadt), z czego **tylko 1 jest aktywny** (`is_active = true`), reszta nieaktywna. Stąd rozjazd.
2. **Rzeszów pokazuje „1 użytkownik".** Rzeszów ma w bazie 11 różnych kodów pocztowych (35-036, 35-083, 35-213, 35-317, 36002, brak kodu…). Obecna logika `ambiguousCityKeys` uznaje miasto za „niejednoznaczne", gdy występuje więcej niż jeden kod pocztowy, i geokoduje **osobno każdy kod** — powstaje kilkanaście osobnych punktów po 1–4 osoby zamiast jednego znacznika Rzeszowa.
3. **Napis „Leaflet | Tiles © Esri"** w prawym dolnym rogu nie jest zasłonięty — kontrolki są ułożone pionowo powyżej.

## Plan naprawy

### 1. Filtr danych — tylko aktywni z kompletnym adresem
Migracja: aktualizacja funkcji `get_user_location_points()` tak, aby zwracała wyłącznie profile, które mają jednocześnie:
- `is_active = true`,
- niepuste `city`, `country`, `postal_code`,
- brak trwającego usuwania konta (`deletion_status` puste/`none`) i brak blokady (`blocked_at IS NULL`).

Dodatkowo poprawka dostępu: obecnie funkcja zwraca dane tylko adminowi (`has_role(auth.uid(),'admin')`), więc dla pozostałych ról widget pokazuje wyłącznie stary cache z localStorage. Widoczność mapy i tak jest sterowana ustawieniami `dashboard_map_settings`, więc funkcja będzie zwracać dane każdemu zalogowanemu użytkownikowi (dane są anonimizowane: imię + inicjał nazwiska).

### 2. Spójne liczniki i grupowanie (`src/components/admin/UserWorldMap.tsx`)
- **Geokodowanie po `miasto|kraj`** — rezygnacja z rozbijania po kodzie pocztowym w obrębie tego samego miasta i kraju. Kod pocztowy pozostaje wysyłany jako pomocniczy parametr zapytania (pierwszy pasujący, do trafności geokodera), ale klucz grupowania to miasto+kraj, więc wszyscy z Rzeszowa trafią do jednego znacznika. Nazwy miast powtarzające się w różnych krajach nadal rozróżnia kraj.
- **Popup kraju liczy tylko te osoby, które są faktycznie naniesione na mapę** (suma z grup znaczników w danym kraju), więc „4 użytkowników" nigdy nie rozjedzie się z liczbą na znacznikach. Jeśli część adresów czeka na geokodowanie, popup dopisuje informację „(x oczekuje na lokalizację)".

### 3. Kontrolki nad napisem Leaflet
Kontener przycisków `+ / − / reset` zmieniony z pionowego na **poziomy pasek w prawym dolnym rogu** (`bottom-0 right-0`, tło `bg-background/90`, zaokrąglony lewy górny róg), o wysokości i szerokości wystarczającej, by całkowicie zakryć atrybucję Leaflet/Esri.

## Pliki
- migracja SQL: `get_user_location_points()`
- `src/components/admin/UserWorldMap.tsx`
