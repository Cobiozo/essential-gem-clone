
# Plan: Naprawa 4 krytycznych problemów

## Zidentyfikowane problemy

### Problem 1: Postęp szkoleń pokazuje 0% w panelu admina

**Szczegóły:**
- Szymon Latocha ma ukończone **14 lekcji z 21** w module BIZNESOWE = **67%**
- Panel admina pokazuje **0%**
- **Przyczyna:** Poprzednia poprawka dodała filtr `.in('user_id', userIds)`, ale problem tkwi w tym, że `userIds` pochodzi z `training_assignments`, a Szymon może nie mieć przypisania w tej tabeli (jego postęp jest zapisany w `training_progress`)
- **Rozwiązanie:** Pobierać postępy dla WSZYSTKICH użytkowników z tabeli `training_progress` bez filtrowania po przypisaniach, lub użyć paginacji aby ominąć limit 1000 wierszy

### Problem 2: "Panel CMS" zamiast "Panel Administratora"

**Lokalizacja:** `src/hooks/useTranslations.ts` linia 970
- Aktualna wartość: `'nav.admin': 'Panel CMS'`
- Wymagana zmiana: `'nav.admin': 'Panel Administratora'`

### Problem 3: Brak napisu "PURE LIFE" pod złotą kroplą na stronie głównej

**Analiza:**
- `HeroSection.tsx` renderuje obraz z `alt="Pure Life"` ale nie ma dodatkowego tekstu pod logo
- System texts w bazie: `header_text` = `<br>` (pusty), `author` = pusty
- Strona główna wyświetla tylko obraz bez tekstu "PURE LIFE" pod spodem
- **Rozwiązanie:** Dodać stylizowany tekst "PURE LIFE" bezpośrednio pod logo w `HeroSection.tsx` (jako element stały, nie konfigurowalny przez CMS)

### Problem 4: "Moje spotkania" pokazuje wydarzenia, na które użytkownik nie jest zapisany

**Analiza:**
- Widżet używa hooka `getUserEvents()` z `useEvents.ts`
- `getUserEvents()` pobiera rejestracje użytkownika z status='registered'
- Problem: Wydarzenia multi-occurrence (np. "Start nowego partnera" z 12.02) mogą być wyświetlane mimo braku rejestracji na konkretny termin
- **Przyczyna:** Gdy użytkownik nie jest zapisany na żadne wystąpienie, ale wydarzenie ma wiele terminów, może pojawiać się błędnie
- Nie ma błędnych rejestracji w bazie - sprawdzono listę dla 12.02 i są tam tylko faktycznie zapisani użytkownicy
- **Prawdopodobna przyczyna:** Problem może wynikać z faktu, że funkcja `getUserEvents` nie sprawdza poprawnie `occurrence_index` dla wydarzeń cyklicznych

---

## Szczegółowy plan naprawy

### Faza 1: Naprawa pobierania postępów szkoleń

**Plik:** `src/components/admin/TrainingManagement.tsx`

Zmiana strategii pobierania danych w funkcji `fetchUserProgress`:

```typescript
// Zamiast filtrować po userIds z assignments, pobierz WSZYSTKIE postępy z paginacją
const fetchUserProgress = async () => {
  setProgressLoading(true);
  try {
    // Pobierz assignments (dla listy modułów)
    const { data: assignments, error: assignmentsError } = await supabase
      .from('training_assignments')
      .select(`...`);

    if (assignmentsError) throw assignmentsError;

    // Pobierz WSZYSTKIE rekordy postępu (z paginacją dla dużych zbiorów)
    let allProgressData: any[] = [];
    let from = 0;
    const batchSize = 1000;
    
    while (true) {
      const { data, error } = await supabase
        .from('training_progress')
        .select('user_id, lesson_id, is_completed, time_spent_seconds, video_position_seconds')
        .range(from, from + batchSize - 1);
      
      if (error) throw error;
      if (!data || data.length === 0) break;
      
      allProgressData = [...allProgressData, ...data];
      if (data.length < batchSize) break; // Ostatnia strona
      from += batchSize;
    }
    
    progressData = allProgressData;
    // ... reszta logiki bez zmian
  }
};
```

### Faza 2: Zmiana nazwy w sidebarze

**Plik:** `src/hooks/useTranslations.ts`

Zmiana w linii 970:
- **Przed:** `'nav.admin': 'Panel CMS'`
- **Po:** `'nav.admin': 'Panel Administratora'`

### Faza 3: Dodanie tekstu "PURE LIFE" pod logo

**Plik:** `src/components/HeroSection.tsx`

Dodanie widocznego tekstu pod obrazem logo:

```tsx
{/* Logo */}
<div className={cn(...)}>
  <img src={headerImage} alt="Pure Life" className={...} />
</div>

{/* NOWE: Dodanie tekstu "PURE LIFE" pod logo */}
<h1 className="text-2xl sm:text-3xl font-bold tracking-widest text-foreground mt-4">
  PURE LIFE
</h1>
```

Tekst będzie:
- Widoczny w obu trybach (jasnym i ciemnym) dzięki klasie `text-foreground`
- Stylizowany podobnie jak reszta strony (czcionka bold, tracking-widest)
- Responsywny (mniejszy na mobile, większy na desktop)

### Faza 4: Naprawa widżetu "Moje spotkania"

**Plik:** `src/hooks/useEvents.ts`

Problem polega na tym, że widżet może pokazywać wydarzenia, na które użytkownik nie jest faktycznie zapisany. Trzeba zweryfikować logikę w `getUserEvents`:

1. Sprawdzić, czy zapytanie do `event_registrations` zawiera właściwe filtry
2. Upewnić się, że dla wydarzeń multi-occurrence sprawdzany jest `occurrence_index`
3. Dodać dodatkowe logowanie do debugowania

**Obecna logika (linie 509-654):**
```typescript
const getUserEvents = useCallback(async () => {
  if (!user) return [];

  // Step 1: Get user's registrations WITH occurrence_index
  const { data: registrations, error: regError } = await supabase
    .from('event_registrations')
    .select('event_id, occurrence_index')
    .eq('user_id', user.id)
    .eq('status', 'registered');
```

Ta logika wygląda poprawnie. Jednak należy sprawdzić, czy problem nie wynika z cache'owania lub nieaktualnych danych. Dodamy wymuszenie odświeżania.

**Dodatkowa weryfikacja:**
Należy upewnić się, że realtime subscription prawidłowo odświeża dane po rejestracji/wypisaniu.

---

## Podsumowanie pliku i zmian

| Plik | Zmiana | Priorytet |
|------|--------|-----------|
| `src/components/admin/TrainingManagement.tsx` | Paginacja przy pobieraniu postępów (ominięcie limitu 1000) | WYSOKI |
| `src/hooks/useTranslations.ts` | `'nav.admin': 'Panel Administratora'` | NISKI |
| `src/components/HeroSection.tsx` | Dodanie tekstu "PURE LIFE" pod logo | ŚREDNI |
| `src/hooks/useEvents.ts` | Dodanie lepszego logowania + weryfikacja cache | WYSOKI |

---

## Oczekiwane rezultaty

1. **Postępy szkoleń** - Szymon Latocha (i inni) będą widoczni z rzeczywistym postępem (67% dla BIZNESOWE)
2. **Sidebar** - "Panel CMS" zmieni się na "Panel Administratora"
3. **Strona główna** - Pod złotą kroplą pojawi się napis "PURE LIFE" widoczny zarówno w jasnym jak i ciemnym trybie
4. **Moje spotkania** - Widżet będzie pokazywał tylko wydarzenia, na które użytkownik jest faktycznie zapisany

