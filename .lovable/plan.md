## Plan naprawy

1. **Naprawię upload PNG/JPG szablonu biletu**
   - Dodam migrację do Supabase, która uzupełni brakujące uprawnienie `WITH CHECK` dla aktualizacji pliku w `storage.objects`.
   - To usuwa błąd `new row violates row-level security policy`, który pojawia się przy uploadzie z `upsert: true`.
   - Upload będzie dalej dostępny tylko dla admina.

2. **Format biletu będzie dokładnie taki jak wgrany obraz**
   - Po wgraniu obrazu zapiszę jego naturalne wymiary jako płótno szablonu.
   - Ustawienia `Format` i `Orientacja` nie będą wymuszać A4/A5 na PDF, gdy szablon ma własny obraz.
   - PDF dostanie proporcje i rozmiar wynikające z wgranego PNG/JPG, więc podgląd nie będzie rozciągany do A5.

3. **Naprawię podgląd PDF**
   - Zmieniam generowanie PDF tak, aby tryb podglądu zawsze zwracał prawidłowy plik PDF z aktualnym tłem i polskimi znakami.
   - Poprawię rozpoznawanie obrazów z URL z parametrem `?t=...`, bo obecnie `.endsWith('.png')` może nie zadziałać po dodaniu cache-bustera.
   - Dodam w UI lepszy komunikat błędu, jeśli Edge Function zwróci JSON zamiast PDF.

4. **Usprawnię pracę w edytorze szablonu**
   - Po uploadzie tła automatycznie dopasuję obszar roboczy do proporcji obrazu.
   - Pola i QR zostaną pozycjonowane względem faktycznych wymiarów wgranego pliku.
   - Przycisk „Podgląd PDF” będzie zapisywał aktualny układ i otwierał wygenerowany podgląd w nowej karcie.

## Szczegóły techniczne

- Migracja doda/zmieni politykę Storage dla `event-tickets/templates/*`, żeby `upsert` mógł wykonać zarówno insert, jak i update z poprawnym `WITH CHECK`.
- `generate-event-ticket-pdf` dostanie tryb strony oparty o `width_px` / `height_px` przy własnym tle, zamiast sztywnego formatu A5/A4.
- Rozpoznawanie PNG/JPG będzie bazować na ścieżce URL bez query stringa albo `Content-Type`, a nie na pełnym URL z `?t=`.