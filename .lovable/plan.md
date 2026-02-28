
# Naprawa wyswietlania wlasnych tel

## Diagnoza

Upload dziala poprawnie — w bazie Supabase Storage jest 4 plikow w bucket `meeting-backgrounds`. Ale w UI widac "Twoje tla (0/3)" — hook `useCustomBackgrounds` nie pobiera listy.

### Prawdopodobna przyczyna
1. **Race condition**: `useEffect` z `listBackgrounds` uruchamia sie na mount, ale `user` z `useAuth` moze byc jeszcze `null`. Callback `listBackgrounds` ma `if (!user) return` — wiec nic nie robi. Potem `user` sie zmienia, ale `listBackgrounds` jest memoizowane przez `useCallback` z zaleznoscia `[user]` — wiec powinno sie odpalic ponownie przez `useEffect([listBackgrounds])`. Jednak jesli `user` przychodzi z opoznieniem i komponent re-renderuje sie wielokrotnie, moze byc problem z timingiem.

2. **4 pliki w storage, limit 3**: Uzytkownik przeslal 4 pliki (bo walidacja `customImages.length >= 3` bazuje na stanie ktory moze byc 0 w momencie uploadu). Trzeba najpierw usunac nadmiarowy plik i poprawic walidacje.

3. **Ciche bledy**: `listBackgrounds` lapie bledy w `catch` i loguje je do konsoli, ale uzytkownik nic nie widzi. Mozliwe ze `list()` zwraca blad ktory jest polykany.

## Plan naprawy

### Plik 1: `src/hooks/useCustomBackgrounds.ts`

**a) Dodanie retry i lepszego logowania:**
- Dodac `console.log` na poczatku `listBackgrounds` zeby widziec czy sie odpala
- Dodac retry z opoznieniem jesli `user` jest jeszcze null

**b) Usunac limit z list():**
- Zamiast `limit: MAX_BACKGROUNDS` uzyc `limit: 100` — zeby zawsze pobrac wszystkie pliki
- Walidacja limitu zostaje tylko przy uploadzie

**c) Dodac refetch po otwarciu dropdown:**
- Eksportowac `listBackgrounds` (jako `refetch`) z hooka
- Wywolac `refetch` w `BackgroundSelector` gdy dropdown sie otwiera (onOpenChange)

**d) Lepsze logowanie bledow:**
- Toast z bledem jesli `list()` sie nie powiedzie

### Plik 2: `src/components/meeting/BackgroundSelector.tsx`

**a) Dodac `onOpenChange` do `DropdownMenu`:**
- Wywolac `onRefresh?.()` callback gdy menu sie otwiera
- To zapewni ze lista jest aktualna za kazdym razem

**b) Dodac prop `onRefresh`:**
- Nowy opcjonalny prop w `BackgroundSelectorProps`

### Plik 3: `src/components/meeting/MeetingControls.tsx`

**a) Przekazac `onRefresh` do BackgroundSelector:**
- Podlaczyc do `refetch` z hooka `useCustomBackgrounds`

### Plik 4: `src/components/meeting/VideoRoom.tsx`

**a) Eksportowac `refetch` z `useCustomBackgrounds`:**
- Przekazac jako nowy prop `onRefreshBackgrounds` do `MeetingControls`

### Dodatkowe: Wyczyscic nadmiarowe pliki w storage

Uzytkownik ma 4 pliki ale limit to 3. Nie bedzie SQL migracji — po prostu hook pokaze wszystkie pliki (bez limitu w list) i pozwoli usunac nadmiarowe przez UI.

## Zmiany techniczne

### `useCustomBackgrounds.ts`
```text
Zmiana 1: list() bez limitu
  - limit: MAX_BACKGROUNDS  ->  limit: 100

Zmiana 2: eksport refetch
  - return { ..., refetch: listBackgrounds }

Zmiana 3: lepsze logowanie
  - console.log na poczatku listBackgrounds
  - console.log po uzyskaniu wynikow
```

### `BackgroundSelector.tsx`
```text
Zmiana 1: nowy prop onRefresh
  - onRefresh?: () => void

Zmiana 2: onOpenChange na DropdownMenu
  - <DropdownMenu onOpenChange={(open) => { if (open) onRefresh?.() }}>
```

### `MeetingControls.tsx`
```text
Zmiana 1: nowy prop onRefreshBackgrounds
  - onRefreshBackgrounds?: () => void

Zmiana 2: przekazanie do BackgroundSelector
  - onRefresh={onRefreshBackgrounds}
```

### `VideoRoom.tsx`
```text
Zmiana 1: eksport refetch z useCustomBackgrounds
  - refetch: refetchBackgrounds

Zmiana 2: przekazanie do MeetingControls
  - onRefreshBackgrounds={refetchBackgrounds}
```

## Efekt
- Lista wlasnych tel bedzie odswiezana za kazdym razem gdy uzytkownik otworzy menu tla
- Nie bedzie race condition — nawet jesli poczatkowy fetch sie nie powiedzie, kolejne otwarcie menu pobierze dane
- Uzytkownik zobaczy swoje 4 przeslane tla i bedzie mogl usunac nadmiarowe
