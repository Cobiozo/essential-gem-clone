Plan naprawy mapy:

1. Zatrzymanie przewijania strony nad mapą
- Dopiszę natywny listener `wheel` na SVG z `{ passive: false }`, bo sam React `onWheel` bywa niewystarczający dla blokowania scrolla strony.
- Listener będzie działał tylko, gdy kursor jest nad mapą i zawsze wykona `preventDefault()` oraz `stopPropagation()`.

2. Mniejsze, płynniejsze skoki zoomu rolką
- Zmniejszę czułość zoomu rolką, np. z obecnego `Math.pow(1.0015, -deltaY)` do łagodniejszego mnożnika.
- Dodam normalizację `deltaY`, żeby mysz i touchpad dawały przewidywalny efekt.
- Zachowam zoom wokół kursora.

3. Drag nie będzie wybierał państwa
- Dodam rozróżnienie kliknięcia od przeciągnięcia: jeśli wskaźnik przesunie się ponad mały próg, kliknięcie kraju zostanie zignorowane.
- Podczas drag/pinch wyłączę selekcję tekstu i domyślne akcje przeglądarki.
- Po zakończeniu przeciągania krótki „click suppression” zablokuje przypadkowy `onClick` na kraju lub kropce.

4. Tooltipy miast na kropkach
- Naprawię `onMouseMove`, który obecnie potrafi nadpisywać tooltip pustym tytułem zanim dane z `onMouseEnter` się utrwalą.
- Tooltip będzie budowany bezpośrednio z danych kropki przy każdym ruchu kursora.
- Dla pojedynczej kropki pokażę miasto, kraj i liczbę użytkowników; dla klastra listę miast.

Pliki do zmiany:
- `src/components/admin/UserWorldMap.tsx`

Bez zmian w bazie danych, RPC ani RLS.