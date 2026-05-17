Zmiany w `src/components/admin/UserWorldMap.tsx`:

1. Pozycja startowa = widok z screena (Europa wyśrodkowana)
- Dostroję `defaultView`, żeby przy starcie i po resecie mapa pokazywała kadr jak na screenie:
  - centrum ok. lng 15, lat 50 (środek Europy),
  - zoom ~3.8 dla trybu klasycznego i satelitarnego.
- Dotyczy też przycisku „reset”, bo on już używa `defaultView`.

2. Odklikanie państwa wraca do pozycji startowej
- W `handleCountryClick`, w gałęzi „to samo państwo ponownie kliknięte” (odznaczanie), po wyczyszczeniu `selectedIso/selectedLabel` wywołam `animateTo(defaultView, 600)`.
- Tak samo dla przycisku „X” przy etykiecie wybranego państwa w nagłówku — obecnie tylko czyści stan; dorzucę powrót do `defaultView`.

Bez zmian w bazie, RPC, RLS ani innych plikach.