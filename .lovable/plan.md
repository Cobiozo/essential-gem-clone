

# Audyt Akademii + Flaga "Bez certyfikatu" na module szkoleniowym

## Audyt — stan obecny

Przepływ certyfikatów działa poprawnie:
- Po ukończeniu 100% lekcji w module, sekcja certyfikatu pojawia się na karcie modułu (Training.tsx, linia 886).
- Użytkownik klika "Wygeneruj" → `useCertificateGeneration` generuje PDF, pobiera go, wysyła email, tworzy rekord w `certificates`.
- Regeneracja z 24h cooldown działa prawidłowo.
- Edge function `auto-generate-certificate` weryfikuje ukończenie i szuka szablonu przypisanego do modułu (brak szablonu = błąd).
- System sekwencyjnego odblokowywania, nowe lekcje po certyfikacie, trigger `auto_complete_training_assignment` — wszystko spójne.

**Zidentyfikowany problem**: Każdy ukończony moduł automatycznie pokazuje sekcję certyfikatu. Nie ma możliwości oznaczenia modułu jako "bez certyfikatu". Jeśli nie ma przypisanego szablonu, użytkownik zobaczy przycisk "Wygeneruj", ale generacja zakończy się błędem.

---

## Plan implementacji: flaga `certificate_enabled` na module

### 1. Migracja bazy danych
Dodanie kolumny `certificate_enabled BOOLEAN DEFAULT true` do tabeli `training_modules`.

```sql
ALTER TABLE public.training_modules
  ADD COLUMN certificate_enabled boolean NOT NULL DEFAULT true;
```

Domyślnie `true` — wszystkie istniejące moduły zachowują obecne zachowanie.

### 2. `src/components/admin/TrainingManagement.tsx` — ModuleForm
- Dodać checkbox **"Certyfikat po ukończeniu"** do formularza edycji modułu (obok istniejących pól).
- Dodać pole `certificate_enabled` do `formData` i `saveModule`.
- W tabeli modułów (desktop) — opcjonalna ikonka/badge informująca, że moduł nie ma certyfikatu.

### 3. `src/pages/Training.tsx` — widok użytkownika
- Pobrać `certificate_enabled` z `training_modules` (już pobiera `*`).
- Przy `progress === 100`:
  - Jeśli `certificate_enabled === false` — zamiast sekcji certyfikatu wyświetlić informacyjny baner:
    **"Gratulacje! Ukończyłeś to szkolenie. Ten moduł szkoleniowy nie kończy się wystawieniem certyfikatu."**
  - Jeśli `certificate_enabled === true` — obecna logika bez zmian.

### 4. `src/types/training.ts`
- Dodać `certificate_enabled?: boolean` do interfejsu `TrainingModule`.

### 5. `src/components/admin/TrainingManagement.tsx` — interfejs modułu
- Dodać `certificate_enabled` do lokalnego interfejsu `TrainingModule`.

### 6. Edge function `auto-generate-certificate`
- Dodać sprawdzenie `certificate_enabled` na module przed generacją. Jeśli `false` — zwrócić odpowiedź `{ success: false, error: 'Module does not issue certificates' }` bez rzucania wyjątku.

### 7. Trigger `auto_complete_training_assignment`
- Bez zmian — ukończenie modułu (is_completed) nadal działa niezależnie od certyfikatu.

---

## Pliki do zmiany
1. **Migracja SQL** — nowa kolumna `certificate_enabled`
2. `src/types/training.ts` — dodanie pola
3. `src/components/admin/TrainingManagement.tsx` — checkbox w formularzu + interfejs
4. `src/pages/Training.tsx` — warunkowe wyświetlanie sekcji certyfikatu vs info-baner
5. `supabase/functions/auto-generate-certificate/index.ts` — guard check

