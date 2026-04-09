

# Fix: Kompaktowy widok uprawnień liderów

## Problemy
1. Żółte badge'e uprawnień widoczne przed rozwinięciem — zaśmiecają widok
2. Brak możliwości przewijania (ScrollArea z `max-h-[600px]` nie działa poprawnie)
3. Za mało kompaktowy layout

## Zmiany w `src/components/admin/LeaderPanelManagement.tsx`

### 1. Ukryć badge'e uprawnień — przenieść do CollapsibleContent
- Usunąć blok `px-4 pb-2 flex flex-wrap gap-1` z badge'ami (linie 443-450) sprzed `CollapsibleContent`
- Przenieść je na górę `renderPermEditor` — widoczne dopiero po rozwinięciu

### 2. Kompaktowy nagłówek aktywnego lidera
- Karta lidera: tylko imię, email, licznik X/22 i chevron — nic więcej
- Zmniejszyć padding do `py-2` zamiast `py-3`

### 3. Naprawić przewijanie
- Zamienić `ScrollArea` z `max-h-[600px]`/`max-h-[650px]` na kontener z `overflow-y-auto` i dynamiczną wysokością `max-h-[calc(100vh-280px)]`
- Obie kolumny powinny przewijać się niezależnie

### 4. Kompaktowa prawa kolumna
- Usunąć zbędne odstępy, zmniejszyć padding w kartach bez uprawnień

## Efekt
- Widok znacznie bardziej kompaktowy — liderzy to zwięzłe rzędy z licznikiem
- Po kliknięciu/rozwinięciu: badge'e aktywnych uprawnień + switche edycji
- Obie kolumny scrollowalne na pełną wysokość ekranu

