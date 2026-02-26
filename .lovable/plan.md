
## Audyt responsywności modulu Akademii -- Apple / iOS

### Podsumowanie

Modul Akademii jest **ogolnie dobrze przygotowany** pod urzadzenia mobilne. Zastosowano zwijane listy lekcji (Collapsible), `playsInline` + `webkit-playsinline` dla wideo iOS, sticky headery, responsywny grid i klasy `sm:` / `lg:`. Ponizej lista wykrytych problemow i rekomendacji.

---

### Problemy krytyczne

#### 1. Header Akademii -- przycinanie na malych ekranach iPhone SE/Mini (Training.tsx, linia 616)
Naglowek zawiera przycisk "Powrot", separator, tytul i przycisk "Odswiez akademie" w jednej linii (`flex items-center justify-between`). Na iPhone SE (320px) elementy nakladaja sie lub przycinaja.

**Rozwiazanie**: Zastosowac `flex-wrap` i zmniejszyc padding na malych ekranach. Rozwazyc przeniesienie przycisku odswiezania do nowej linii na mobile.

#### 2. Banner "jezyk obcy" -- przycisk i tekst w jednej linii (linia 753)
Banner z informacja o przegladaniu innego jezyka uzywa `flex items-center justify-between gap-4`. Na waskich ekranach przycisk "Wroc do swojej sciezki" moze sie nie miescic.

**Rozwiazanie**: Zmienic na `flex-wrap` lub `flex-col` na mobile (`flex flex-col sm:flex-row`).

#### 3. Sekcja certyfikatu -- overflow na mobile (linie 865-963)
Dluga data (`"26 lutego 2026 o 14:30"`) + tekst informacyjny + przycisk regeneracji w kartach certyfikatu moga powodowac overflow horyzontalny.

**Rozwiazanie**: Dodac `break-words` i `overflow-hidden` do kontenera certyfikatu.

---

### Problemy srednie

#### 4. VideoControls -- zbyt wiele przyciskow w jednej linii (VideoControls.tsx, linia 150)
Na iPhone kontrolki wideo (Play, -10s, pasek postepu, czas, Napraw, Pomoc, Fullscreen) moga sie tloczyc. `flex-wrap` jest obecny, ale `gap-2 sm:gap-4` moze byc niewystarczajacy.

**Rozwiazanie**: Ukryc tekst "Napraw" i "Pomoc" na mobile (juz czesciowo zrobione), rozwazyc grupowanie ikon w drugi rzad.

#### 5. SecureVideoControls -- podobny problem (SecureVideoControls.tsx, linia 97)
Kontrolki: Play, -10s, +10s, czas, predkosc, Napraw, Fullscreen -- 7 elementow w jednym rzedzie.

**Rozwiazanie**: Na mobile ukryc etykiety tekstowe (`hidden sm:inline` juz czesciowo zastosowane), zmniejszyc `min-w-[60px]` przycisku predkosci.

#### 6. Brak `safe-area-inset` w sticky headerach
Sticky header (`sticky top-0`) nie uwzglednia notcha iPhone'a. Gdy uzytkownik jest w trybie PWA, tytul moze zachodzic pod Dynamic Island / notch.

**Rozwiazanie**: Dodac `pt-[env(safe-area-inset-top)]` do headerow sticky lub uzyc klasy `top-[env(safe-area-inset-top)]`.

#### 7. Karty modulow -- grid 3 kolumny na tablecie
`grid gap-6 md:grid-cols-2 lg:grid-cols-3` -- na iPad Mini (768px) wyswietla 2 kolumny co jest poprawne, ale na iPad Pro 11" (834px) tez 2 kolumny. Rozwazyc `md:grid-cols-2 xl:grid-cols-3` dla lepszego wykorzystania przestrzeni na tabletach.

---

### Problemy drobne

#### 8. Baner informacyjny o systemie szkolen (linia 733)
Tekst listy `<ul>` z dlugimi zdaniami moze byc trudny do czytania na 320px. Rozwazyc mniejszy font na mobile (`text-xs sm:text-sm`).

#### 9. LessonNotesDialog -- scroll area na malym ekranie
`max-h-[300px]` na ScrollArea moze byc za duze na iPhone SE w orientacji poziomej, pozostawiajac malo miejsca na formularz dodawania. Rozwazyc `max-h-[200px] sm:max-h-[300px]`.

#### 10. Brak `overscroll-behavior-contain` na kontenerze lekcji
Przy przewijaniu treści lekcji na iOS, gest moze propagowac do rodzica i powodowac "bounce" calej strony.

**Rozwiazanie**: Dodac `overscroll-behavior: contain` do glownego kontenera treści.

---

### Juz poprawnie zaimplementowane (bez zmian)

- `playsInline` + `webkit-playsinline` na wszystkich elementach `<video>` -- kluczowe dla iOS
- `touch-action: manipulation` na przyciskach (globalnie w CSS)
- Collapsible lista lekcji na mobile z osobnym renderingiem (`lg:hidden` / `hidden lg:block`)
- `word-break: break-word` na tytulach lekcji
- Responsywne rozmiary wideo (`max-h-[50vh] sm:max-h-[60vh] lg:max-h-[70vh]`)
- Debounce na `visibilitychange` (AuthContext)
- Preload `auto` dla VPS, `metadata` dla Supabase
- localStorage backup postępu na `beforeunload`
- Adaptive buffer config bazujacy na urzadzeniu/sieci

---

### Plan implementacji -- 4 zmiany

1. **Training.tsx -- fix headerow i banerow na mobile**
   - Header: `flex-wrap` + responsive padding
   - Banner jezyka: `flex-col sm:flex-row`
   - Baner info: mniejszy font na mobile
   - Kontener certyfikatu: `overflow-hidden break-words`

2. **Training.tsx + TrainingModule.tsx -- safe-area-inset dla sticky headerow**
   - Dodac `top-[env(safe-area-inset-top)]` lub `pt-safe` do sticky headerow

3. **VideoControls.tsx + SecureVideoControls.tsx -- lepsze grupowanie na mobile**
   - Zmniejszenie min-width przyciskow
   - Ukrycie dodatkowych etykiet

4. **LessonNotesDialog.tsx -- responsive max-height**
   - `max-h-[200px] sm:max-h-[300px]`
