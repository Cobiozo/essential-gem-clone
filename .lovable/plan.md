

# Analiza modułu szkoleniowego - problemy z postępem i zaliczaniem

## Podsumowanie wyników analizy

Zidentyfikowałem **dwa odrębne problemy** zgłoszone przez użytkowników:

---

## Problem 1: Pasek postępu nie pokazuje 100% mimo certyfikatu

### Przyczyna (potwierdzona danymi z bazy)

**Nowa lekcja została dodana po ukończeniu szkolenia przez użytkowników.**

Dane z bazy potwierdzają to jednoznacznie:
- Moduł "SPRZEDAŻOWE" ma 9 aktywnych lekcji
- Użytkownicy z certyfikatami mają ukończone tylko 8/9 lekcji (89%)
- Brakująca lekcja: **"GWARANCJA SATYSFAKCJI"** 
  - Data utworzenia: **25 stycznia 2026** (dzisiaj!)
  - Certyfikaty wygenerowane: 13-24 stycznia 2026

**Obliczanie postępu jest poprawne** - po prostu uwzględnia wszystkie aktualne lekcje, w tym nowo dodane.

### Rozwiązanie

Należy zdecydować o strategii:

**Opcja A - Automatyczne zaliczenie nowych lekcji dla posiadaczy certyfikatu** (zalecane)

Dodać mechanizm, który przy obliczaniu postępu uznaje wszystkie nowe lekcje (dodane po dacie certyfikatu) jako "zaliczone" dla użytkowników, którzy już mają certyfikat.

```text
Logika: Jeśli użytkownik ma certyfikat wystawiony PRZED utworzeniem lekcji,
        lekcja nie powinna wpływać na jego % postępu
```

**Opcja B - Migracja danych**

Jednorazowy skrypt SQL oznaczający brakujące lekcje jako ukończone dla posiadaczy certyfikatów.

**Opcja C - Wymaganie ukończenia nowych lekcji**

Zachowanie obecnego zachowania - wymaganie ukończenia nowych materiałów nawet po certyfikacie.

---

## Problem 2: Przycisk "Zakończ" nie zalicza lekcji

### Przyczyna (zidentyfikowana w kodzie)

Po dokładnej analizie kodu `goToNextLesson()` (linie 785-920) zidentyfikowałem potencjalne problemy:

**A) Brak obsługi błędu zapisu do bazy**

```typescript
// Linia 804-815 - zapis do bazy bez sprawdzenia błędu
await supabase
  .from('training_progress')
  .upsert({ ... });
// BRAK: if (error) throw error;
```

Jeśli zapis do bazy się nie powiedzie (np. problem z siecią), lekcja nie zostanie zaliczona, ale użytkownik tego nie wie.

**B) Niespójność training_assignments**

Dane z bazy pokazują, że wiele certyfikatów istnieje bez odpowiadającego `is_completed: true` w `training_assignments`.

**C) Race condition przy szybkim klikaniu**

Flag `isTransitioningRef` i `isNavigating` mogą powodować pominięcie zapisu przy szybkich kliknięciach.

### Rozwiązanie

```typescript
// Dodać obsługę błędu i retry dla upsert w goToNextLesson
const { error: progressError } = await supabase
  .from('training_progress')
  .upsert({ ... });

if (progressError) {
  console.error('Failed to save progress:', progressError);
  toast({
    title: "Błąd zapisu",
    description: "Nie udało się zapisać postępu. Spróbuj ponownie.",
    variant: "destructive"
  });
  return; // Nie przechodź dalej
}
```

---

## Szczegółowy plan napraw

### 1. Naprawa obliczania postępu (Training.tsx + TrainingProgressWidget.tsx)

**Plik: `src/pages/Training.tsx`** (linie 357-369)

Zmodyfikować zapytanie tak, aby:
- Pobrać datę certyfikatu użytkownika dla modułu
- Wykluczyć z licznika nowe lekcje (created_at > certificate.issued_at)

```typescript
// Pobierz ukończone lekcje
const { data: progressData } = await supabase
  .from('training_progress')
  .select(`
    is_completed,
    lesson:training_lessons!inner(module_id, created_at)
  `)
  .eq('user_id', user.id)
  .eq('lesson.module_id', module.id)
  .eq('is_completed', true);

// Pobierz datę certyfikatu
const certDate = certMap[module.id]?.issued_at;

// Filtruj lekcje do zliczenia (tylko te sprzed certyfikatu lub bez certyfikatu)
const relevantLessonsCount = certDate
  ? lessonsData?.filter(l => new Date(l.created_at) <= new Date(certDate)).length
  : lessonsCount;

completedLessons = progressData?.length || 0;
```

**Plik: `src/components/dashboard/widgets/TrainingProgressWidget.tsx`** (linie 54-84)

Analogiczna zmiana - uwzględnienie daty certyfikatu przy obliczaniu postępu.

### 2. Naprawa zapisu postępu (TrainingModule.tsx)

**Plik: `src/pages/TrainingModule.tsx`** (linie 800-830)

Dodać obsługę błędu i potwierdzenie zapisu:

```typescript
const { error: progressError } = await supabase
  .from('training_progress')
  .upsert({
    user_id: user.id,
    lesson_id: currentLesson.id,
    time_spent_seconds: effectiveTime,
    video_position_seconds: hasVideo ? videoPositionRef.current : 0,
    is_completed: true,
    completed_at: new Date().toISOString()
  }, { 
    onConflict: 'user_id,lesson_id'
  });

if (progressError) {
  console.error('[TrainingModule] Error saving completion:', progressError);
  toast({
    title: "Błąd",
    description: "Nie udało się zapisać postępu lekcji. Spróbuj ponownie.",
    variant: "destructive"
  });
  setIsNavigating(false);
  isTransitioningRef.current = false;
  return; // Zatrzymaj nawigację
}
```

### 3. Migracja naprawcza (jednorazowa)

**Nowy plik: `supabase/migrations/[timestamp]_fix_training_progress.sql`**

```sql
-- 1. Napraw training_assignments dla użytkowników z certyfikatami
UPDATE training_assignments ta
SET 
  is_completed = true,
  completed_at = c.issued_at
FROM certificates c
WHERE ta.user_id = c.user_id 
  AND ta.module_id = c.module_id
  AND (ta.is_completed = false OR ta.is_completed IS NULL);

-- 2. Dodaj brakujące rekordy postępu dla nowych lekcji
-- (dla użytkowników z certyfikatami wydanymi przed dodaniem lekcji)
INSERT INTO training_progress (user_id, lesson_id, is_completed, completed_at, time_spent_seconds)
SELECT DISTINCT 
  c.user_id,
  tl.id,
  true,
  c.issued_at,
  60
FROM certificates c
JOIN training_lessons tl ON tl.module_id = c.module_id
LEFT JOIN training_progress tp ON tp.user_id = c.user_id AND tp.lesson_id = tl.id
WHERE tl.is_active = true
  AND tl.created_at > c.issued_at
  AND tp.id IS NULL
ON CONFLICT (user_id, lesson_id) DO NOTHING;
```

### 4. Dodanie pola issued_at do certificates w zapytaniach

**Zmiana w `fetchCertificates()` (Training.tsx linia 71-75):**

```typescript
const { data, error } = await supabase
  .from('certificates')
  .select('id, module_id, file_url, issued_at')  // dodać issued_at
  .eq('user_id', user.id)
  .order('issued_at', { ascending: false });
```

I aktualizacja certMap aby przechowywać datę:
```typescript
certMap[cert.module_id] = { 
  id: cert.id, 
  url: cert.file_url, 
  issuedAt: cert.issued_at 
};
```

---

## Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/pages/Training.tsx` | Uwzględnić datę certyfikatu przy obliczaniu postępu; obsługa issued_at |
| `src/components/dashboard/widgets/TrainingProgressWidget.tsx` | Uwzględnić datę certyfikatu przy obliczaniu postępu |
| `src/pages/TrainingModule.tsx` | Dodać obsługę błędów przy zapisie postępu w goToNextLesson |
| `supabase/migrations/[timestamp]_fix_training_progress.sql` | Migracja naprawcza danych |

---

## Oczekiwany rezultat

1. Użytkownicy z certyfikatami widzą 100% postępu (nowe lekcje po certyfikacie są automatycznie "zaliczone")
2. Kliknięcie "Zakończ" zawsze zapisuje postęp lub pokazuje błąd
3. Dane w bazie są spójne (training_assignments + training_progress + certificates)
4. Przyszłe dodawanie lekcji do modułów nie psuje postępu dla istniejących certyfikatów

