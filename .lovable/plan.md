

# Dodanie legendy zmiennych w lewym panelu edytora mapowania

## Co robimy
Dodajemy stały panel po lewej stronie canvasu w `BpFileMappingEditor` z pełną legendą zmiennych dynamicznych. Panel będzie zawsze widoczny (niezależnie od zaznaczenia obiektu) i umożliwi szybkie wstawianie zmiennych kliknięciem.

## Zmiany w `BpFileMappingEditor.tsx`

### Nowy lewy panel (przed canvasem, wewnątrz `flex flex-1`)
- Stały panel ~220px z nagłówkiem "Zmienne dynamiczne"
- Pełna lista z `VARIABLES_LEGEND` (wszystkie 11 zmiennych)
- Każda pozycja: klucz (`{{imie}}`) jako klikalna etykieta mono + opis po polsku
- Kliknięcie wstawia zmienną do zaznaczonego elementu lub tworzy nowy element tekstowy
- Sekcja z krótkim opisem: "Kliknij zmienną aby wstawić ją na canvas"

### Layout
Obecny layout `flex flex-1`:
```text
[ canvas (flex-1) ] [ properties (w-64, warunkowy) ]
```
Nowy layout:
```text
[ legenda (w-56, stały) ] [ canvas (flex-1) ] [ properties (w-64, warunkowy) ]
```

### Jeden plik do zmiany
`src/components/admin/BpFileMappingEditor.tsx` — dodanie panelu legendy w sekcji `flex flex-1` przed `containerRef`.

