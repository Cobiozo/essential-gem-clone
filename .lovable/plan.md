

# Plan: Naprawienie kolorów + edytor drag-and-drop na podglądzie

## Część 1: Naprawienie text_color we wszystkich sekcjach

### Problem
Sekcje używają hardcoded klas Tailwind (`text-white`, `text-foreground`, `text-muted-foreground`) na elementach potomnych — te nadpisują odziedziczony kolor z inline style na rodzicu. Niektóre sekcje (Steps, CtaBanner, FAQ) w ogóle nie obsługują `text_color`.

### Rozwiązanie
Propagować `text_color` bezpośrednio do KAŻDEGO elementu tekstowego zamiast polegać na dziedziczeniu CSS. Gdy `text_color` jest ustawiony — nie stosować klas Tailwind z kolorem.

### Pliki do zmian:
| Sekcja | Zmiana |
|--------|--------|
| `HeroSection.tsx` | Usunąć `text-white` z h1, p, stats gdy `text_color` jest ustawiony; zastosować inline style bezpośrednio na każdym elemencie |
| `TextImageSection.tsx` | Usunąć `text-foreground`/`text-muted-foreground` gdy `text_color` ustawiony |
| `StepsSection.tsx` | Dodać obsługę `text_color` z config (obecnie brak) |
| `CtaBannerSection.tsx` | Dodać obsługę `text_color` |
| `FaqSection.tsx` | Dodać obsługę `text_color` i `bg_color` |

## Część 2: Drag-and-drop builder na podglądzie

### Nowe możliwości:
- Przeciąganie sekcji w górę/dół celem zmiany kolejności
- Toolbox z przyciskami "Dodaj sekcję" (po kliknięciu wyświetla dostępne typy)
- Przycisk "+" pomiędzy sekcjami do wstawiania nowych
- Przycisk usuwania sekcji (kosz na hover)
- Duplikowanie sekcji

### Zmiany w TemplatePreviewPage.tsx:
1. Owinąć sekcje w `DragDropProvider` + `SortableContext` (dnd-kit — już w projekcie)
2. Dodać `SortableSectionWrapper` — komponent owijający sekcję z uchwytem drag i przyciskami (edytuj, usuń, duplikuj)
3. Dodać floating toolbox / przycisk "Dodaj sekcję" — modal/dropdown z listą typów sekcji
4. Przyciski "+" między sekcjami do wstawiania w konkretnym miejscu
5. Logika: `handleAddSection(type, insertAt)` tworzy nowy element z domyślnym config i dodaje do `template[]`

### Nowe pliki:
| Plik | Opis |
|------|------|
| `src/components/admin/template-preview/SortableSectionWrapper.tsx` | Wrapper sekcji z uchwytem drag, przyciskami edycji/usunięcia/duplikacji |
| `src/components/admin/template-preview/AddSectionMenu.tsx` | Menu z dostępnymi typami sekcji do dodania |
| `src/components/admin/template-preview/defaultSectionConfigs.ts` | Domyślne konfiguracje dla nowych sekcji |

### Zmiany w istniejących plikach:
| Plik | Zmiana |
|------|--------|
| `TemplatePreviewPage.tsx` | Integracja DragDropProvider, SortableContext, AddSectionMenu, logika dodawania/usuwania/duplikacji sekcji |

```text
Wizualny UX:

  ⠿ [drag]  [✏️ Edytuj] [📋 Duplikuj] [🗑️ Usuń]
  ┌──────────────────────────────────────────┐
  │          Sekcja Hero                     │
  └──────────────────────────────────────────┘
                  [+ Dodaj sekcję]
  ⠿ [drag]  [✏️ Edytuj] [📋 Duplikuj] [🗑️ Usuń]
  ┌──────────────────────────────────────────┐
  │          Sekcja Steps                    │
  └──────────────────────────────────────────┘
                  [+ Dodaj sekcję]
```

