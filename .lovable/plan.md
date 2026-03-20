

# Podgląd ankiety w panelu admina

## Cel
Dodać przycisk "Podgląd" w `SurveyManager`, który przełącza widok między edytorem a interaktywnym podglądem ankiety (`SurveySection`). Admin będzie mógł przetestować działanie ankiety (klikanie odpowiedzi, nawigacja, wyniki) bez opuszczania panelu.

## Zmiany

### Plik: `src/components/admin/SurveyManager.tsx`
- Dodać state `showPreview` (boolean, domyślnie `false`)
- Dodać przycisk **"Podgląd"** (ikona `Eye`/`EyeOff`) obok przycisku "Zapisz" w headerze karty
- Gdy `showPreview === true`: renderować `SurveySection` z aktualnym `surveyConfig` zamiast `SurveySectionEditor`
- Podgląd owinąć w kontener z zaokrąglonymi rogami i ciemnym tłem, żeby wyglądał realistycznie
- Przycisk przełącza etykietę: "Podgląd" ↔ "Edytor"

### Wizualny układ

```text
┌─ Ankieta zdrowotna ──────────────────────────┐
│ [Zarządzaj pytaniami...]     [👁 Podgląd] [💾] │
│                                                │
│  ┌─ Podgląd ankiety (ciemne tło) ───────────┐ │
│  │  Ankieta zdrowotna                        │ │
│  │  ████████░░░░░░░░  (progress bar)         │ │
│  │  Pytanie 1 z 10                           │ │
│  │  Jaka jest Twoja płeć?                    │ │
│  │  ○ Kobieta                                │ │
│  │  ○ Mężczyzna                              │ │
│  │  [Wstecz]              [Dalej →]          │ │
│  └───────────────────────────────────────────┘ │
└────────────────────────────────────────────────┘
```

### Import
- Zaimportować `SurveySection` z `@/components/partner-page/sections`
- Dodać ikonę `Eye` / `EyeOff` z lucide-react

### Szczegóły
- Podgląd używa bieżącego `surveyConfig` (nie zapisanego) — admin widzi zmiany w czasie rzeczywistym
- Kontener podglądu: `rounded-xl overflow-hidden` aby wyglądał jak embed
- Żadnych zmian w `SurveySection.tsx` — komponent już działa samodzielnie

