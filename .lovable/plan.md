

# Audyt WelcomeWidget — pętle i wycieki

## Wyniki

Kod jest **w dobrym stanie**. Timer jest prawidłowo czyszczony, visibility change handler jest usuwany w cleanup. Znaleziono **2 drobne problemy** i **1 niespójność**:

### 1. ⚠️ `now` i `getGreeting` nie używają `currentTime` (niespójność)

Linie 88-89: `const now = new Date()` i `const hour = now.getHours()` tworzą nową datę przy każdym renderze, ale **nie zależą od stanu `currentTime`**. Oznacza to, że:
- Data i powitanie aktualizują się tylko przy re-renderze z innego powodu
- Zegar (`formattedTime`) używa `currentTime` ze stanu — poprawnie

**Fix**: Użyć `currentTime` zamiast `new Date()` dla spójności.

### 2. ⚠️ `getTodayWorldDays()` wywoływane przy każdym renderze (co 1s)

Linia 87: Funkcja jest wywoływana przy każdym re-renderze (co sekundę przez timer). Choć jest tania, powinna być memoizowana — wynik zmienia się raz dziennie.

**Fix**: `useMemo(() => getTodayWorldDays(), [currentTime.toDateString()])` — przelicza tylko przy zmianie dnia.

### 3. ✅ Timer — poprawny

- `clearInterval` w cleanup ✓  
- `visibilitychange` listener usuwany ✓  
- Timer zatrzymywany przy ukrytej karcie ✓

### 4. ✅ `tf` w useMemo — stabilny

`tf` jest owinięty w `useCallback` z zależnością od `t`, który zmienia się tylko przy zmianie języka. `timezones` memo nie będzie się przeliczać niepotrzebnie.

### 5. ✅ Brak wycieków pamięci

Żadnych subskrypcji, event listenerów ani async operacji bez cleanup.

---

## Plan zmian

### `src/components/dashboard/widgets/WelcomeWidget.tsx`

1. Zamienić `const now = new Date()` → użyć `currentTime`
2. Memoizować `getTodayWorldDays()` z kluczem `currentTime.toDateString()`
3. Memoizować `formattedDate` z kluczem dnia i języka

```typescript
// Zamiast:
const todayWorldDays = getTodayWorldDays();
const now = new Date();
const hour = now.getHours();

// Będzie:
const hour = currentTime.getHours();

const todayWorldDays = useMemo(() => getTodayWorldDays(), [currentTime.toDateString()]);

const formattedDate = useMemo(() => 
  format(currentTime, 'EEEE, d MMMM yyyy', {
    locale: language === 'pl' ? pl : enUS,
  }), [currentTime.toDateString(), language]
);
```

Drobne optymalizacje, zero ryzyka regresji.

