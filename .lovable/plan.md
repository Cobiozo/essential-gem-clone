# Sekcja Prelegenci: usunięcie żółtego tła + przycisk „Czytaj więcej"

## Problem

1. Sekcja „Prelegenci" na publicznej stronie wydarzenia ma jaskrawe żółte tło (komponent domyślnie używa `hsl(var(--primary))`, który w tym motywie jest złoto-żółty) — wygląda źle i nie pasuje do reszty strony.
2. Bio prelegenta jest obcięte do 3 linii bez możliwości rozwinięcia.

W panelu admina (podgląd) sekcja używa neutralnego tła strony i prostych kart — i to ma być wzorzec.

## Zakres zmian

### `src/components/paid-events/public/PaidEventSpeakers.tsx` — przepisanie
- **Usunąć domyślny żółty fill.** Sekcja ma korzystać z neutralnego tła strony (`bg-background`/transparent), tak jak w podglądzie admina. Karty: `bg-card border-border`, tekst `text-foreground` / `text-muted-foreground`. Specjalne tło włącza się tylko, jeśli `backgroundColor` lub `textColor` zostaną jawnie podane (zachowana kompatybilność).
- **Usunąć ikonę-pigułkę przy nagłówku** — sam tytuł „Prelegenci" jak w edytorze admina.
- **Grid 2-kolumnowy** (zamiast 3), karty bardziej oddychające — bliżej layoutu z podglądu admina (screenshot pokazuje 2 kolumny).
- **Avatar**: `ring-2 ring-border` zamiast `ring-4 ring-white/30`.
- **Dodać przycisk „Czytaj więcej / Zwiń"** pod bio każdego prelegenta:
  - Stan `expanded` per karta (lokalny `useState` w `SpeakerCard`).
  - Gdy zwinięte — `line-clamp-3`; gdy rozwinięte — pełny tekst, z zachowaniem `whitespace-pre-line`.
  - Przycisk: wariant `ghost`, ikony `ChevronDown` / `ChevronUp` (lucide-react), kolor `text-primary`.
  - Przycisk pojawia się tylko gdy bio jest niepuste (zawsze pozwala rozwinąć/zwinąć — proste i przewidywalne UX, niezależne od długości tekstu).

### Pliki edytowane
- `src/components/paid-events/public/PaidEventSpeakers.tsx` — pełne przepisanie zgodnie z powyższym.

Brak zmian w `PaidEventPage.tsx` ani w schemacie bazy.

## Uwagi
- Funkcja `backgroundColor`/`textColor` z bazy pozostaje — gdyby admin świadomie chciał kolorowe tło sekcji, nadal będzie działać; bez ustawień sekcja jest neutralna.
- Na podglądzie admina (`EventEditorPreview.tsx`) używana jest własna, prosta lista kart — pozostaje bez zmian (i tak nie miała żółtego tła).
