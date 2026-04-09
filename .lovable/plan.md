

# Edytor zawartości PureBox w panelu admina

## Problem
Cała zawartość PureBox (pytania oceny umiejętności, opisy, progi Omega, kamienie milowe) jest zahardkodowana w plikach TypeScript. Admin nie ma możliwości edycji treści bez zmiany kodu.

## Rozwiązanie

Stworzyć tabelę `purebox_content` przechowującą edytowalne treści, edytor w panelu admina (nowa zakładka w `PureBoxManagement`) i hooka do pobierania treści z fallbackiem na hardkodowane wartości.

### 1. Migracja SQL — tabela `purebox_content`

```
purebox_content
├── id (uuid PK)
├── content_key (text UNIQUE) — np. "assessment_steps", "omega_thresholds", "omega_milestones"
├── content_data (jsonb) — pełna struktura danych (pytania, progi, opisy)
├── updated_at (timestamptz)
├── updated_by (uuid → auth.users)
```

RLS: SELECT dla authenticated, UPDATE/INSERT tylko admin.

### 2. Edytor w panelu admina — rozszerzenie `PureBoxManagement`

Dodać zakładki (Tabs) w `PureBoxManagement`:
- **Widoczność** (obecna zawartość)
- **Ocena Umiejętności** — edycja 12 kroków: tytuł, opis, 4 zakresy (label, description, color)
- **Dziennik Omega** — edycja progów (ratio/index), kamieni milowych, etykiet

Każda zakładka z formularzem edycji i przyciskiem Zapisz. Podgląd live zmian.

### 3. Hook `usePureBoxContent`

Nowy hook pobierający dane z `purebox_content` z fallbackiem na `ASSESSMENT_STEPS` / `OmegaThresholds`:
- Jeśli rekord w bazie istnieje → użyj go
- Jeśli nie → użyj zahardkodowanych defaults

### 4. Aktualizacja komponentów

Komponenty `AssessmentStep`, `AssessmentSummary`, `SkillsRadarChart` i komponenty omega odczytują dane z hooka zamiast z importu statycznego.

## Pliki do zmiany/utworzenia

| Plik | Zmiana |
|------|--------|
| Migracja SQL | Nowa tabela `purebox_content` + RLS |
| `src/hooks/usePureBoxContent.ts` | Nowy hook (fetch + fallback) |
| `src/components/admin/PureBoxManagement.tsx` | Dodanie zakładek z edytorami treści |
| `src/components/admin/purebox/AssessmentContentEditor.tsx` | Nowy — edytor pytań oceny |
| `src/components/admin/purebox/OmegaContentEditor.tsx` | Nowy — edytor progów/kamieni |
| `src/pages/SkillsAssessment.tsx` | Użycie hooka zamiast statycznego importu |
| `src/components/skills-assessment/AssessmentStep.tsx` | Props z hooka |
| `src/components/skills-assessment/AssessmentSummary.tsx` | Props z hooka |
| `src/pages/OmegaTests.tsx` | Użycie hooka dla progów |
| `src/components/omega-tests/VitalityProgress.tsx` | Dane z hooka |

