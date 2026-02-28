
Cel: naprawić realny problem „nie mogę dodać własnego tła” tak, żeby działało stabilnie nawet przy chwilowych problemach sesji, oraz żeby UI nie sugerował uploadu, gdy użytkownik nie ma uprawnień (gość / niezalogowany).

## Co ustaliłem z kodu i danych

1. Upload do bucketu **faktycznie działa** (w `storage.objects` są nowe pliki użytkownika, obecnie 16).
2. Bucket i polityki RLS dla `meeting-backgrounds` są poprawnie ustawione dla `authenticated` (SELECT/INSERT/DELETE po prefiksie `auth.uid()`).
3. Problem jest po stronie frontendu:
   - `useCustomBackgrounds` przy błędzie `list()` ustawia `customImages=[]` i użytkownik widzi `0/3`, mimo że pliki istnieją.
   - Auto-cleanup opiera się na `list()`, więc gdy listowanie pada, limit nie jest egzekwowany i liczba plików rośnie.
   - W `MeetingControls` upload własnych teł jest podawany także w trybie guest (i praktycznie przy braku usera), więc użytkownik może klikać „Dodaj tło”, ale backend odrzuci jako niezalogowany.
4. Dodatkowo znalazłem wyścig autoryzacji w `MeetingRoom.tsx`: logika potrafi przejść do `unauthorized` zanim `AuthContext` zakończy `loading`, co daje efekt „jestem zalogowany, ale system traktuje mnie jak niezalogowanego”.

## Plan naprawy (do wdrożenia)

### 1) Ustabilizowanie autoryzacji w wejściu do meetingu
Plik: `src/pages/MeetingRoom.tsx`

- Rozszerzyć `useAuth()` o `loading`.
- W `verify access` nie wykonywać ścieżki `unauthorized`, dopóki `loading === true`.
- Dopiero po zakończonym ładowaniu auth i braku usera przechodzić do `unauthorized`.
- To usuwa sytuacje, gdzie użytkownik „na chwilę” ma `user=null` i przez to traci możliwość uploadu.

Efekt: mniej fałszywych stanów „niezalogowany”.

---

### 2) Twarde ograniczenie uploadu własnych teł do zalogowanych (bez guest)
Pliki:
- `src/components/meeting/VideoRoom.tsx`
- `src/components/meeting/MeetingControls.tsx`
- opcjonalnie `src/components/meeting/BackgroundSelector.tsx` (komunikat UX)

Zmiany:
- W `VideoRoom` przekazywać `onUploadBackground` i `onDeleteBackground` **tylko gdy** `user && !guestMode`.
- Dodać jasny toast, gdy ktoś spróbuje uploadu bez sesji („Musisz być zalogowany, aby dodać własne tło”).
- W `MeetingControls`/`BackgroundSelector` ukryć sekcję „Twoje tła” dla guesta (lub pokazać informację zamiast przycisku upload).

Efekt: UI nie obiecuje funkcji, której aktualnie nie da się wykonać.

---

### 3) Odporność `useCustomBackgrounds` na błędy listowania
Plik: `src/hooks/useCustomBackgrounds.ts`

Kluczowe poprawki:
1. **Optimistic update po udanym uploadzie**
   - po `upload(path, file)` natychmiast dodać URL do `customImages` lokalnie (z limitem 3),
   - nie czekać wyłącznie na `listBackgrounds()`.

2. **Lokalny cache ścieżek** (per user, np. `meeting_custom_backgrounds_${user.id}` w `localStorage`)
   - po udanym uploadzie dopisać nową ścieżkę do cache,
   - po udanym `list()` zsynchronizować cache z realną listą,
   - gdy `list()` zwróci błąd: fallback do cache i nadal pokazać użytkownikowi dostępne tła.

3. **Lepsze czyszczenie limitu**
   - przy uploadzie utrzymywać max 3 na podstawie najlepiej dostępnego źródła:
     - najpierw wynik `list()`,
     - jeśli listowanie padło: cache.
   - usuwać najstarsze i logować wynik `remove()` z pełnym błędem.

4. **Silniejsze logowanie diagnostyczne**
   - logować kod/status/bucket/user/path dla `list/upload/remove`,
   - dzięki temu kolejny incydent da się jednoznacznie przypisać do auth, RLS, czy API.

Efekt: użytkownik po uploadzie widzi swoje tło od razu, nawet jeśli chwilowo `list()` nie odpowie poprawnie.

---

### 4) Drobna poprawa UX błędów
Plik: `src/components/meeting/VideoRoom.tsx`

- W `catch` przy uploadzie mapować komunikaty na czytelne teksty:
  - brak sesji,
  - limit/rozmiar pliku,
  - brak uprawnień.
- Pokazywać komunikat akcyjny („Odśwież spotkanie po zalogowaniu”).

Efekt: użytkownik wie dokładnie co zrobić, zamiast ogólnego „Błąd”.

## Dlaczego to rozwiąże problem „ciągle nie mogę dodać tła”

- Obecnie pliki się zapisują, ale UI gubi je przy błędach listowania lub chwilowym `user=null`.
- Po zmianach:
  - upload będzie natychmiast widoczny lokalnie,
  - fallback cache utrzyma widoczność teł mimo potknięć API,
  - guest/bez sesji nie będzie mógł wejść w martwą ścieżkę uploadu,
  - wyścig auth w `MeetingRoom` przestanie losowo „wylogowywać” logikę.

## Walidacja po wdrożeniu (checklista)

1. Zalogowany użytkownik:
   - dodać tło → pojawia się od razu w „Twoje tła”.
2. Dodać 4–5 teł:
   - w UI finalnie max 3, najstarsze usuwane.
3. Odświeżyć stronę i wrócić do meetingu:
   - tła nadal widoczne (z listy lub fallback cache).
4. Tryb guest:
   - brak możliwości uploadu własnych teł (jasny komunikat).
5. Sytuacja słabej sesji/odświeżenia tokenu:
   - brak fałszywego przejścia do `unauthorized` zanim auth się zainicjalizuje.

## Zakres plików do modyfikacji

- `src/pages/MeetingRoom.tsx`
- `src/components/meeting/VideoRoom.tsx`
- `src/components/meeting/MeetingControls.tsx`
- `src/components/meeting/BackgroundSelector.tsx` (jeśli potrzebny komunikat UX)
- `src/hooks/useCustomBackgrounds.ts`

Bez zmian w bazie danych i bez nowych polityk RLS (na ten moment niepotrzebne — backend wygląda poprawnie, problem jest w flow klienta).
