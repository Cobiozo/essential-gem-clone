# Plan: Edytor HTML zgodny z Layout Editorem platformy

## Status: ✅ ZAIMPLEMENTOWANY

## Wykonane zmiany

### 1. ✅ Nowy layout z lewym panelem elementów
- Utworzono `HtmlElementsPanel.tsx` z kategoryzowaną siatką elementów (Widżety/Globalne)
- Usunięto górny `HtmlElementToolbar` - elementy teraz są dodawane z lewego panelu
- Layout: `[Panel elementów w-80] | [Podgląd + Panel właściwości]`

### 2. ✅ Pełna wysokość podglądu
- Zamieniono `overflow-y-auto` na `ScrollArea` dla prawidłowego rozciągania
- Kontener główny: `h-full flex overflow-hidden`
- Visual Editor Tab: `flex-1 h-0 min-h-0 overflow-hidden` + `ScrollArea`
- Preview Tab: `overflow-hidden` + `ScrollArea` dla interaktywnego podglądu

### 3. ✅ Sekcja "Akcja przycisku" w zakładce Wygląd
- Dodano sekcję dla elementów typu `button` w zakładce "Wygląd" (Style)
- Bezpośredni dostęp do: typ akcji, URL/ścieżka, tekst do skopiowania, target

## Pliki zmodyfikowane

| Plik | Zmiana |
|------|--------|
| `src/components/admin/html-editor/HtmlElementsPanel.tsx` | **Nowy** - panel elementów |
| `src/components/admin/html-editor/HtmlHybridEditor.tsx` | Nowy layout, ScrollArea, import panelu |
| `src/components/admin/html-editor/SimplifiedPropertiesPanel.tsx` | Sekcja "Akcja przycisku" |

## Struktura nowego layoutu

```
┌─────────────────────────────────────────────────────────────────┐
│ Header: Powrót | Tytuł strony | [Edytor] [Ustawienia] | Zapisz  │
├─────────────────────────────────────────────────────────────────┤
│  Lewy panel (w-80)     │  Podgląd + Panel właściwości (flex-1) │
│  ┌──────────────────┐  │  ┌────────────────────┬──────────────┐│
│  │ "Elementy"       │  │  │ Podgląd HTML       │ Właściwości  ││
│  │  [Widżety|Global]│  │  │ (ScrollArea)       │ (po zaznacz) ││
│  │  ┌────┐ ┌────┐  │  │  │                    │              ││
│  │  │ H1 │ │ H2 │  │  │  │                    │              ││
│  │  └────┘ └────┘  │  │  │                    │              ││
│  │  ┌────┐ ┌────┐  │  │  │                    │              ││
│  │  │Obr.│ │Wideo│  │  │  │                    │              ││
│  │  └────┘ └────┘  │  │  │                    │              ││
│  └──────────────────┘  │  └────────────────────┴──────────────┘│
└─────────────────────────────────────────────────────────────────┘
```
