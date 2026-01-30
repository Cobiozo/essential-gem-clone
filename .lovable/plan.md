

# Plan: Osobny Layout Editor dla Płatnych Wydarzeń

## Cel

Stworzyć dedykowany edytor wizualny dla płatnych wydarzeń w stylu referencyjnego screena - z panelem edycji po lewej stronie i podglądem na żywo strony wydarzenia po prawej.

## Wizualizacja nowego layoutu

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  ← Powrót    │  Edytor wydarzenia: LinkedIn w Firmie                │  👁 Podgląd  │  💾 Zapisz     │
│              │  Edytuj treści i zobacz podgląd na żywo               │              │                │
└──────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐  ┌────────────────────────────────────────────────────┐
│          PANEL EDYCJI (lewa strona)         │  │         PODGLĄD NA ŻYWO (prawa strona)             │
│                                             │  │                                                    │
│  ┌─────────────────────────────────────────┐│  │  ┌────────────────────────────────────────────────┐│
│  │ Główne                                  ││  │  │  [Hero Banner]                                 ││
│  │ Sekcje treści  │  Bilety  │  Prelegenci ││  │  │  LinkedIn w Firmie - kompleksowe szkolenie     ││
│  └─────────────────────────────────────────┘│  │  │  📅 20 luty 2026    📍 Online                  ││
│                                             │  │  └────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────┐│  │                                                    │
│  │ ▼ Sekcja Hero                  [+] [−] ││  │  ┌───────────────────────────┐ ┌────────────────┐ │
│  │   ┌───────────────────────────────────┐││  │  │  O szkoleniu              │ │  REJESTRACJA   │ │
│  │   │ title (text)          [Zapisz] 🗑 │││  │  │  ─────────────────────    │ │                │ │
│  │   │ ┌─────────────────────────────┐   │││  │  │  Kompleksowe szkolenie    │ │  Przedpłata    │ │
│  │   │ │ LinkedIn w Firmie...        │   │││  │  │  dotyczące LinkedIn...    │ │  648 zł        │ │
│  │   │ └─────────────────────────────┘   │││  │  │                           │ │                │ │
│  │   │ Klucz: event.title                │││  │  │                           │ │  [Zapisz się]  │ │
│  │   └───────────────────────────────────┘││  │  └───────────────────────────┘ └────────────────┘ │
│  │   ┌───────────────────────────────────┐││  │                                                    │
│  │   │ date (datetime)       [Zapisz] 🗑 │││  │  ┌────────────────────────────────────────────────┐│
│  │   │ ┌─────────────────────────────┐   │││  │  │  Dlaczego warto wziąć udział?                 ││
│  │   │ │ 2026-02-20 09:00            │   │││  │  │  ─────────────────────────────────────────    ││
│  │   │ └─────────────────────────────┘   │││  │  │  Twój profil na LinkedIn to nie wirtualne...  ││
│  │   └───────────────────────────────────┘││  │  └────────────────────────────────────────────────┘│
│  └─────────────────────────────────────────┘│  │                                                    │
│                                             │  │  ┌────────────────────────────────────────────────┐│
│  ┌─────────────────────────────────────────┐│  │  │  Program szkolenia                            ││
│  │ ▶ O szkoleniu               [↑][↓][✏️] ││  │  │  ─────────────────────────────────────────    ││
│  └─────────────────────────────────────────┘│  │  │  • LinkedIn jako narzędzie rozwoju...         ││
│                                             │  │  │  • Profil, który sprzedaje kompetencje...     ││
│  ┌─────────────────────────────────────────┐│  │  └────────────────────────────────────────────────┘│
│  │ ▶ Dlaczego warto            [↑][↓][✏️] ││  │                                                    │
│  └─────────────────────────────────────────┘│  │  ┌─────────────── Prelegenci ────────────────────┐│
│                                             │  │  │   [Avatar] Marcin Pietraszek                 ││
│  ┌─────────────────────────────────────────┐│  │  │            Empemedia                          ││
│  │ ▶ Program szkolenia         [↑][↓][✏️] ││  │  └────────────────────────────────────────────────┘│
│  └─────────────────────────────────────────┘│  │                                                    │
│                                             │  └────────────────────────────────────────────────────┘
│  ┌─────────────────────────────────────────┐│
│  │ [+ Dodaj sekcję]                        ││  Podgląd na żywo — Kliknij sekcję, aby przejść do edycji
│  └─────────────────────────────────────────┘│
│                                             │
└─────────────────────────────────────────────┘
```

## Architektura rozwiązania

### Nowe komponenty

| Komponent | Opis |
|-----------|------|
| `PaidEventEditorLayout.tsx` | Główny layout split-view (lewa: panel, prawa: podgląd) |
| `EventEditorSidebar.tsx` | Panel boczny z zakładkami (Główne, Sekcje, Bilety, Prelegenci) |
| `EventEditorPreview.tsx` | Iframe lub inline preview strony wydarzenia |
| `EventMainSettingsPanel.tsx` | Formularz głównych ustawień (tytuł, data, lokalizacja) |
| `EventSectionsPanel.tsx` | Collapsible lista sekcji z inline edycją |
| `EventTicketsPanel.tsx` | Zarządzanie biletami z drag-and-drop |
| `EventSpeakersPanel.tsx` | Zarządzanie prelegentami |

### Modyfikacje istniejących plików

| Plik | Zmiana |
|------|--------|
| `PaidEventsList.tsx` | Zmiana akcji "Edytuj treści" na otwarcie nowego edytora |
| `PaidEventsManagement.tsx` | Obsługa stanu edycji pełnoekranowej |

## Szczegóły techniczne

### 1. PaidEventEditorLayout.tsx

Główny komponent z layoutem split-view:

```typescript
interface PaidEventEditorLayoutProps {
  eventId: string;
  eventSlug: string;
  onClose: () => void;
}

// Struktura:
// - ResizablePanelGroup z react-resizable-panels
// - Lewy panel: 40% szerokości (min 350px)
// - Prawy panel: 60% szerokości (podgląd)
```

### 2. EventEditorSidebar.tsx

Zakładki z edytorami:

```typescript
// Zakładki:
// 1. "Główne" - tytuł, slug, data, lokalizacja, status
// 2. "Sekcje" - collapsible lista sekcji CMS
// 3. "Bilety" - lista pakietów z cenami i benefitami
// 4. "Prelegenci" - lista prelegentów z bio

// Każda sekcja rozwijana jak na screenie:
// - Nagłówek z tytułem i przyciskami [↑][↓][✏️][🗑]
// - Po rozwinięciu: inline edytor pól
// - Przyciski "Zapisz" przy każdym polu
```

### 3. EventEditorPreview.tsx

Podgląd na żywo:

```typescript
// Opcje implementacji:
// A) Iframe z src="/events/{slug}?preview=true" (izolowany, ale wymaga refresh)
// B) Inline rendering PaidEventPage z przekazanymi danymi (real-time)

// Wybór: Opcja B - inline rendering z React Query invalidation
// Po każdej zmianie w panelu -> invalidateQueries -> instant preview update
```

### 4. Integracja z istniejącymi komponentami

Reużycie:
- `ContentSectionEditor.tsx` - jako baza dla EventSectionsPanel
- `PaidEventHero.tsx`, `PaidEventSection.tsx` - do renderingu preview
- `TicketBenefitsEditor.tsx` - do zarządzania benefitami biletów

## Flow użytkownika

```text
1. Admin otwiera /admin?tab=paid-events
2. Na liście wydarzeń klika "Edytuj" przy wydarzeniu
3. Otwiera się pełnoekranowy edytor (PaidEventEditorLayout)
4. Lewa strona: Panel z zakładkami i collapsible sekcjami
5. Prawa strona: Live preview strony wydarzenia
6. Każda zmiana w panelu -> natychmiastowa aktualizacja preview
7. Kliknięcie sekcji w preview -> scroll do edycji tej sekcji w panelu
8. Przycisk "← Powrót" wraca do listy wydarzeń
```

## Synchronizacja real-time

```text
┌─────────────────────┐                    ┌─────────────────────┐
│   EventEditorSidebar │                   │  EventEditorPreview │
│                     │                    │                     │
│  [Edit title] ──────┼──► useMutation ───►│  useQuery           │
│                     │    onSuccess:      │  (auto-refetch)     │
│                     │    invalidate()    │                     │
│                     │                    │  Re-render          │
└─────────────────────┘                    └─────────────────────┘
```

## Nowe pliki do utworzenia

| Plik | Opis |
|------|------|
| `src/components/admin/paid-events/editor/PaidEventEditorLayout.tsx` | Layout split-view |
| `src/components/admin/paid-events/editor/EventEditorSidebar.tsx` | Panel boczny |
| `src/components/admin/paid-events/editor/EventEditorPreview.tsx` | Podgląd live |
| `src/components/admin/paid-events/editor/EventMainSettingsPanel.tsx` | Ustawienia główne |
| `src/components/admin/paid-events/editor/EventSectionsPanel.tsx` | Sekcje CMS |
| `src/components/admin/paid-events/editor/EventTicketsPanel.tsx` | Bilety |
| `src/components/admin/paid-events/editor/EventSpeakersPanel.tsx` | Prelegenci |
| `src/components/admin/paid-events/editor/index.ts` | Eksporty |

## Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/components/admin/paid-events/PaidEventsList.tsx` | Dodanie stanu `editorEventId` i warunkowe renderowanie edytora |
| `src/components/admin/paid-events/PaidEventsManagement.tsx` | Przekazanie props do obsługi pełnoekranowego edytora |

## UI/UX zgodny z referencją

Na podstawie screena:
- Jasne tło panelu edycji (szaro-niebieskie)
- Sekcje jako karty z zaokrąglonymi rogami
- Rozwijane sekcje z ikoną chevron
- Przyciski "Zapisz" i "🗑" przy każdym polu
- Etykiety typu "(text)", "(datetime)" przy polach
- Podpowiedź "Klucz: event.title" pod inputami
- Przycisk "+ Dodaj sekcję" na końcu listy
- Info "Podgląd na żywo — Kliknij sekcję, aby przejść do edycji"

