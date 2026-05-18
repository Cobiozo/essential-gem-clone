Naprawię mapę w `src/components/admin/UserWorldMap.tsx` tak, żeby po kliknięciu/tapnięciu na iOS nie mogła już zamienić się w żółtą planszę.

Zakres zmian:
1. Wyłączę problematyczną warstwę satelitarną na urządzeniach dotykowych/iOS i wymuszę stabilny tryb klasyczny dla mobile/touch, ponieważ obecna żółta plansza pochodzi z renderowania SVG/bitmapy w trybie satelitarnym po interakcji.
2. Usunę możliwość nadawania aktywnego, żółtego wypełnienia krajom w trybie satelitarnym — kliknięcie kraju nie będzie mogło przykryć mapy kolorem `primary`.
3. Wszystkie gesty mapy przeprowadzę przez `safeSetView`, także pan/pinch/wheel/markery, aby żaden `NaN`, zbyt duży zoom ani niepoprawny `viewBox` nie trafił do SVG.
4. Ograniczę zoom markerów na mobile do bezpiecznego poziomu zamiast obecnego minimum `40`, które może dawać ekstremalnie mały `viewBox` i niestabilny render w Safari.
5. Dodam twardy fallback: jeśli urządzenie jest dotykowe albo iOS i wybrany jest tryb satelitarny, komponent automatycznie pokaże tryb klasyczny bez żółtego tła.

Efekt: mapa na iOS będzie stabilna po pojedynczym tapnięciu, bez żółtego zalania ekranu; desktop zachowa możliwość przełączania trybów, ale z bezpieczniejszym zoomem i viewBox.