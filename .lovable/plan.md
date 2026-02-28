

# Naprawa wlasnych tel i dodanie tel Zoom z biblioteki grafik

## Problem 1: Wlasne tla nie sa widoczne i upload daje blad RLS

### Diagnoza
- W buckecie `meeting-backgrounds` jest juz **14 plikow** uzytkownika (z wielokrotnych prob uploadu)
- UI pokazuje "Twoje tla (0/3)" — lista nie zwraca wynikow albo blad jest polykany
- Blad RLS na screenshocie moze pochodzic z proby uploadu (INSERT) po nieudanym listowaniu
- Polityki RLS na storage.objects wygladaja poprawnie, ale problem moze byc w tym, ze Supabase API `list()` wewnetrznie uzywa innego schematu niz oczekiwany

### Rozwiazanie

**a) Wyczyscenie nadmiarowych plikow (SQL migracja):**
- Usunac 11 najstarszych plikow z bucketu, zostawiajac 3 najnowsze
- To pozwoli uzytkownikowi ponownie uploadowac po naprawie

**b) Naprawa `useCustomBackgrounds.ts`:**
- Dodac `try/catch` wokol kazdego wywolania `list()` z pelnym logowaniem
- Zamiast rzucac bledy z listowania, ustawic `customImages = []` i zalogowac blad (zeby UI nadal dzialalo)
- W `uploadImage()`: jesli `list()` padnie, pokazac jasny komunikat zamiast probowac upload
- Dodac timeout/retry dla poczatkowego fetchowania (race condition z auth)

## Problem 2: Tla Zoom z biblioteki grafik dla wszystkich zalogowanych

### Diagnoza
- W tabeli `knowledge_resources` jest **15 grafik** z kategoria "Tlo Zoom" i typem "image"
- Maja publiczne URL-e w buckecie `cms-images` (dostepne bez autoryzacji)
- Obecny kod uzywa 3 statycznych plikow z `/backgrounds/` (hardcoded w `useVideoBackground.ts`)

### Rozwiazanie

**a) Nowy hook `useZoomBackgrounds.ts`:**
- Pobiera z Supabase: `knowledge_resources WHERE category = 'Tlo Zoom' AND resource_type = 'image'`
- Cachuje wyniki w stanie (nie zmienia sie czesto)
- Zwraca tablice URL-i (`source_url`)

**b) Zmiana w `useVideoBackground.ts`:**
- Usunac hardcoded `BACKGROUND_IMAGES`
- Eksportowac stan dynamicznych tel z nowego hooka

**c) Zmiana w `VideoRoom.tsx`:**
- Uzyc nowego hooka `useZoomBackgrounds` do pobrania listy tel
- Przekazac dynamiczna liste do `MeetingControls` zamiast statycznej

### Efekt w UI
- Sekcja "Wirtualne tlo" w dropdown pokaze wszystkie 15 tel Zoom z biblioteki grafik
- Kazdy zalogowany uzytkownik bedzie mial dostep do tych samych tel
- Admin moze zarzadzac lista tel przez panel Knowledge Center (dodawac/usuwac grafiki z kategoria "Tlo Zoom")

## Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| SQL migracja | Usunac 11 nadmiarowych plikow z bucketu |
| `src/hooks/useZoomBackgrounds.ts` | Nowy hook — fetch z knowledge_resources |
| `src/hooks/useVideoBackground.ts` | Usunac hardcoded BACKGROUND_IMAGES, eksportowac dynamicznie |
| `src/hooks/useCustomBackgrounds.ts` | Lepsze error handling, nie polykac bledow listowania |
| `src/components/meeting/VideoRoom.tsx` | Uzyc useZoomBackgrounds, przekazac do MeetingControls |

## Kolejnosc implementacji

1. SQL: wyczyscic nadmiarowe pliki z bucketu
2. Nowy hook `useZoomBackgrounds` — dynamiczne pobieranie tel Zoom
3. Aktualizacja `useVideoBackground` — usunac statyczne tla
4. Naprawa `useCustomBackgrounds` — lepsze error handling
5. Aktualizacja `VideoRoom.tsx` — polaczenie nowego hooka z UI

