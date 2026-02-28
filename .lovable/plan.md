

# Naprawa wlasnych tel i poprawienie jakosci konturu maski

## Diagnoza

### Problem 1: Wlasne tla niewidoczne (0/3)
W buckecie `meeting-backgrounds` jest **14 plikow** uzytkownika (wiele prob uploadu), ale UI ciagle pokazuje "0/3". Polityki RLS wygladaja poprawnie (SELECT, INSERT, DELETE z `storage.foldername(name)[1] = auth.uid()`). Bucket jest publiczny.

Najbardziej prawdopodobna przyczyna: `supabase.storage.list()` zwraca blad ktory jest cichoutylany (linia 32-34 w useCustomBackgrounds.ts ustawia `customImages = []` i robi `return` bez propagacji). Blad moze pochodzic od konfliktu z innymi politkami SELECT na `storage.objects` lub z wewnetrznego limitu Supabase Storage API przy 14 plikach w jednym folderze.

### Problem 2: Zla jakosz konturu (furniture bleed)
Na screenshocie widac polke z ksiazkami "przebijajaca" przez tlo po prawej stronie glowy. Obecna erozja maski (1 px) jest za mala zeby wyciac takie artefakty przy rozdzielczosci przetwarzania 640px. Model `selfie_multiclass_256x256` generuje maske 256x256 co daje ~2.5x upscale do procesu, wiec kazdy piksel blednego konturu robi sie widoczny.

## Plan naprawy

### Krok 1: SQL — wyczyscic nadmiarowe pliki z bucketa

Usunac 11 najstarszych plikow uzytkownika `629a2d9a-994a-4e6a-a9c4-8ae0b07e3770`, zostawiajac 3 najnowsze. To przywroci stan do limitu i zmniejszy szanse na bledy przy `list()`.

```text
DELETE FROM storage.objects
WHERE bucket_id = 'meeting-backgrounds'
  AND name LIKE '629a2d9a-994a-4e6a-a9c4-8ae0b07e3770/%'
  AND id NOT IN (
    SELECT id FROM storage.objects
    WHERE bucket_id = 'meeting-backgrounds'
      AND name LIKE '629a2d9a-994a-4e6a-a9c4-8ae0b07e3770/%'
    ORDER BY created_at DESC
    LIMIT 3
  );
```

### Krok 2: `useCustomBackgrounds.ts` — naprawa listowania

Glowne zmiany:
- **Pelen log odpowiedzi z list()**: logowac `data` i `error` z pelnymi szczegolami, nie tylko `JSON.stringify(error)`
- **Fallback na getPublicUrl**: jesli `list()` zwraca blad, sprobowac bezposrednio zbudowac URL-e z znanych sciezek (np. ostatniego uploadu)
- **Retry z opoznieniem**: dodac jednorazowy retry po 1s jesli pierwsze wywolanie zwroci blad (race condition z auth)
- **Lepsze bledy przy upload**: jesli `list()` padnie przed uploadem, pokazac jasny toast zamiast rzucac generyczny blad
- **Auto-delete agresywniejszy**: przed uploadem, jesli jest >= MAX plikow, usunac WSZYSTKIE najstarsze (nie tylko 1), zostawiajac miejsce na nowy

### Krok 3: `VideoBackgroundProcessor.ts` — ostrzejsza maska dla trybu image

Zmiany tylko w profilu `image` (blur-light/blur-heavy bez zmian):

**a) Agresywniejsza erozja:**
- Zamiast 1 extra erozji, dodac **2 pasy erozji** (kazdy 1px = lacznie 3px z poczatkowym erode/dilate) — to wytnie meble przy konturze
- Alternatywnie: zmienic `erodeMaskOnly` zeby robila 2px erozje w jednym przejsciu (sprawdzac sasiadow o 2 piksele)

**b) Ostrzejszy kontrast:**
- Pre-blur contrast: `10 -> 12` dla image mode
- Post-blur contrast: `8 -> 10` dla image mode
- To bardziej agresywnie zepchnfe wartosci maski do 0 lub 1

**c) Mniejszy blur maski:**
- `blur(1.5px) -> blur(1px)` dla image mode — ostrzejsza krawedz

**d) Ciezszy temporal smoothing dla image:**
- Zmienic proporcje z 0.30/0.70 na 0.40/0.60 dla image mode — wiecej wagi na poprzednich klatkach = mniej migotania krawedzi

**e) Wyzsza rozdzielczosc przetwarzania (solo meeting):**
- Gdy jest tylko 1 uczestnik, uzyc `maxProcessWidth: 800` zamiast 640 — wieksza precyzja maski

### Krok 4: Walidacja

Po wdrozeniu:
1. Otworzyc spotkanie, kliknac "Tlo", sprawdzic czy wlasne tla sa widoczne
2. Wybrac tlo "image", sprawdzic czy polka/meble po prawej stronie nie przebijaja
3. Dodac nowe tlo, zamknac/otworzyc menu — sprawdzic czy miniatura pojawia sie natychmiast

## Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| SQL migracja | Usunac 11 najstarszych plikow z bucketu |
| `src/hooks/useCustomBackgrounds.ts` | Retry logika, pelne logowanie, lepszy auto-delete |
| `src/components/meeting/VideoBackgroundProcessor.ts` | Ostrzejsza erozja (2-3px), wyzszy kontrast, mniejszy blur dla image mode |

## Ryzyka

- Agresywniejsza erozja moze obcinac cienkie detale (np. wlosy, palce) — jesli tak, mozna zmniejszyc do 2px erozji
- Jesli `list()` nadal nie dziala po naprawie, bedzie trzeba sprawdzic czy inne polityki RLS na `storage.objects` nie koliduja (mozliwe ze polityka z innego bucketu blokuje SELECT)

