Problem nie wynika z samej Akademii, tylko z obecnego podejścia: picker w iframe przechwytuje kliknięcia, ale wiele miejsc w aplikacji nie jest zwykłym linkiem ani adresem `/nazwa`; część to przyciski, zakładki, elementy warunkowe albo akcje `navigate()`. Dlatego klikanie w dowolny tekst/sekcję nie zawsze daje poprawny cel.

Plan skuteczniejszego rozwiązania:

1. Dodać centralny rejestr realnych celów nawigacji
- Każde miejsce będzie miało: nazwę, ikonę, ścieżkę/akcję, kategorię i role, dla których istnieje.
- Akademia zostanie wskazana jako właściwa trasa używana przez aplikację: najpewniej `/training`, a jeśli routing faktycznie mapuje `/academy`, zostanie zachowana kompatybilność.
- Rejestr będzie obsługiwał też cele z parametrami i zakładkami, np. `/admin?tab=...`, `/profile?tab=...`, `#sekcja`.

2. Zamienić „kliknij w iframe” na pewny wybór miejsca z mini-pulpitu
- W panelu Admin → System → Dolny pasek mobile przy wyborze celu pokażę miniaturowy pulpit/katalog miejsc aplikacji.
- Admin będzie klikał kafelek konkretnego miejsca, a nie przypadkowy element strony.
- Kafelek od razu zapisze poprawny cel techniczny, nawet jeśli w aplikacji normalnie przejście odbywa się przez `navigate()` albo ukryty przycisk.

3. Zachować możliwość ręcznej ścieżki dla wyjątków
- Pole „ścieżka własna” zostanie, ale jako tryb zaawansowany.
- Dzięki temu da się ustawić anchor, query string albo nietypową ścieżkę, jeśli pojawi się nowy ekran bez rejestru.

4. Naprawić Akademię
- Uzupełnię rejestr o prawidłowy cel Akademii zgodny z aktualnym routingiem aplikacji.
- Po wybraniu kafelka „Akademia” dolny pasek mobile będzie przenosił dokładnie tam, gdzie prowadzi normalna nawigacja aplikacji.

5. Uprościć lub usunąć zawodny live picker
- Obecny picker iframe zostanie usunięty albo zdegradowany do opcji pomocniczej, żeby nie sugerował, że każde kliknięcie w dowolny tekst może być bezbłędnie zamienione na nawigację.

Technicznie:
- Zmiany obejmą głównie `mobileNavRegistry`, `MobileNavPathPicker`, `MobileBottomNavSettings` i ewentualnie `MobileBottomNav`.
- Nie zmieniam logiki bazy danych ani uprawnień.
- Pasek nadal będzie mógł mieć jedną lub dowolną liczbę pozycji.