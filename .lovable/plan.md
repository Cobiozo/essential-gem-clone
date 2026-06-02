Plan wdrożenia:

1. **Naprawa bazy danych dla ustawień intro**
   - Dodać brakujące pole dla momentów wyświetlania.
   - Zmienić model z jednego momentu na wiele momentów, np. `trigger_moments` jako lista zaznaczonych opcji.
   - Rozszerzyć ograniczenie `frequency`, bo w bazie nadal są tylko stare wartości: `always`, `once_per_session`, `once_per_day`.
   - Zachować kompatybilność z istniejącym ustawieniem, żeby obecna konfiguracja nie zniknęła.

2. **Naprawa uploadu w Supabase Storage**
   - Problem nie wynika z braku publikacji na produkcję. Błąd pokazuje, że w podłączonym Supabase nie istnieje bucket `intro-videos`.
   - Utworzyć/naprawić bucket `intro-videos` jako publiczny, z limitem 20 MB i typami wideo.
   - Zostawić obecne polityki RLS: odczyt publiczny, upload/edycja/usuwanie tylko dla administratora.

3. **Panel admina: wybór kilku momentów naraz**
   - Zastąpić pojedynczy dropdown „Moment wyświetlania” listą checkboxów/przełączników.
   - Pozwolić zaznaczyć jednocześnie np.:
     - po włączeniu strony,
     - na stronie logowania,
     - przed zalogowaniem,
     - po prawidłowym logowaniu,
     - przy wejściu do dashboardu.
   - Dodać walidację: minimum jeden moment musi być zaznaczony przed zapisem.

4. **Logika wyświetlania intro**
   - Zmienić `IntroVideoOverlay`, żeby sprawdzał listę momentów, a nie jedną wartość.
   - Zachować istniejące częstotliwości: zawsze, raz na sesję, raz dziennie, raz w tygodniu, raz na użytkownika, przy każdym logowaniu.
   - Dopilnować, żeby intro nie odpalało się wielokrotnie w tym samym momencie przez re-render.

5. **Podgląd**
   - Zaktualizować podgląd tak, żeby pokazywał wszystkie zaznaczone momenty wyświetlania.
   - Przycisk „Podgląd” nadal będzie działał niezależnie od wybranych triggerów.

6. **Komunikaty błędów**
   - Dodać bardziej precyzyjne komunikaty:
     - brak bucketa `intro-videos`,
     - brak migracji kolumn `trigger_moment/trigger_moments`,
     - brak uprawnień administratora do uploadu.

Po zatwierdzeniu wdrożę migrację Supabase oraz zmiany w UI/logice.