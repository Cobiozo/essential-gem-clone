

# Blokada sekwencyjna lekcji w Akademii

## Problem
Funkcja `jumpToLesson` pozwala na swobodną nawigację do dowolnej lekcji bez sprawdzania, czy poprzednia jest zaliczona. Brak wizualnego oznaczenia zablokowanych lekcji.

## Plan

### Plik: `src/pages/TrainingModule.tsx`

**A) Dodać logikę blokady w `jumpToLesson` (~linia 696)**
- Przed zmianą indeksu sprawdzić: czy wszystkie lekcje `0..index-1` mają `is_completed === true`
- Jeśli nie — wyświetlić toast "Zalicz poprzednią lekcję" i `return`
- Wyjątek: nawigacja wstecz (do lekcji już zaliczonych) zawsze dozwolona

**B) Dodać logikę blokady w `LessonSidebarItem` (~linia 912)**
- Obliczyć `isLocked`: lekcja o `index > 0` jest zablokowana gdy `progress[lessons[index-1].id]?.is_completed !== true`
- Wyjątek: `index === 0` — pierwsza lekcja nigdy nie jest zablokowana
- Kolory obramowania:
  - **Zaliczona** (`is_completed`): `border-green-500 bg-green-500/5`
  - **Aktualna** (niezaliczona, `isCurrent`): `border-yellow-500 bg-yellow-500/10` (jak teraz)
  - **Zablokowana** (`isLocked`): `border-red-500/60 bg-red-500/5 opacity-60 cursor-not-allowed`
  - **Odblokowana, nierozpoczęta**: domyślny `border-border`
- Gdy `isLocked`: `onClick` nie wywołuje `jumpToLesson`, zamiast tego toast lub nic
- Dodać ikonę kłódki (`Lock` z lucide) obok nazwy dla zablokowanych lekcji

**C) Zabezpieczyć `goToNextLesson` (~linia 716)**
- Już sprawdza `is_completed` — bez zmian, działa poprawnie

### Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `src/pages/TrainingModule.tsx` | Blokada w `jumpToLesson`, wizualne stany w `LessonSidebarItem` |

