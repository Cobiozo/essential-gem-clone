

# Plan: Podgląd rzeczywisty w nowym oknie + wizualne odstępy przeciąganiem

## Podsumowanie

1. **Podgląd rzeczywisty** - Przycisk obok "Pełny podgląd" otwierający nowe okno przeglądarki z dokładnie takim wyglądem strony, jaki zobaczą użytkownicy
2. **Wizualne odstępy** - Przeciągalna krawędź górna elementu pozwalająca zwiększyć/zmniejszyć `marginTop` (odstęp od poprzedniego elementu)

---

## Zmiana 1: Podgląd w nowym oknie

**Plik**: `src/components/admin/html-editor/HtmlHybridEditor.tsx`

Dodam przycisk obok "Pełny podgląd" w pasku zakładek:

### Lokalizacja
Linia ~545 - po `TabsTrigger value="preview"`, dodam nowy przycisk:

### Działanie
```text
Przycisk z ikoną ExternalLink
│
└── Kliknięcie → window.open() z danymi HTML jako Blob URL
    │
    ├── Tworzy pełny dokument HTML (z Tailwind, fontami, custom CSS)
    ├── Konwertuje na Blob: new Blob([html], { type: 'text/html' })
    ├── Generuje URL: URL.createObjectURL(blob)
    └── Otwiera w nowym oknie: window.open(blobUrl, '_blank')
```

### Wizualnie
```text
┌─────────────────────────────────────────────────────────────────┐
│ [🔵 Edytor wizualny] [📝 Kod HTML] [🌐 Pełny podgląd] [🔗 Nowe okno] │
└─────────────────────────────────────────────────────────────────┘
```

---

## Zmiana 2: Przeciąganie krawędzi dla odstępów

**Nowy komponent**: `src/components/admin/html-editor/MarginHandle.tsx`

### Koncepcja
Dodanie przeciągalnego uchwytu na górnej krawędzi każdego elementu (widoczny w trybie edycji po zaznaczeniu), który pozwala wizualnie zwiększać/zmniejszać `marginTop`.

### Działanie
```text
Element w edytorze:
┌─────────────────────────┐
│ ════ Uchwyt marginu ════ │ ← Przeciągnij w górę/dół = zmiana marginTop
├─────────────────────────┤
│                         │
│    Zawartość elementu   │
│                         │
└─────────────────────────┘
```

1. Kliknięcie i przeciąganie uchwytu w górę → zwiększa marginTop
2. Przeciąganie w dół → zmniejsza marginTop (min 0)
3. Wyświetlenie aktualnej wartości podczas przeciągania
4. Po zwolnieniu → zapisanie do stylów elementu

### Integracja
W `HtmlElementRenderer.tsx` dodam uchwyt marginu dla zaznaczonych elementów:
- Uchwyt widoczny tylko gdy element jest zaznaczony i tryb edycji aktywny
- Wyświetla aktualny marginTop
- Obsługuje mouse/touch events

---

## Szczegóły techniczne

### Zmiana 1: Podgląd w nowym oknie

```tsx
// HtmlHybridEditor.tsx - nowa funkcja
const openRealPreview = useCallback(() => {
  const fullHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <script src="https://cdn.tailwindcss.com"></script>
      <script src="https://unpkg.com/lucide@latest"></script>
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&family=Open+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
      <style>
        body { 
          font-family: 'Open Sans', sans-serif; 
          margin: 0; 
          padding: 24px;
        }
        h1, h2, h3, h4, h5, h6 { 
          font-family: 'Montserrat', sans-serif; 
        }
        ${customCss || ''}
      </style>
    </head>
    <body>
      ${codeValue}
      <script>
        if (window.lucide) {
          lucide.createIcons();
        }
      </script>
    </body>
    </html>
  `;
  
  const blob = new Blob([fullHtml], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}, [codeValue, customCss]);
```

```tsx
// Dodanie przycisku w TabsList (linia ~545)
<Button
  variant="ghost"
  size="sm"
  className="h-7 px-2 gap-1 text-xs ml-2"
  onClick={openRealPreview}
  title="Otwórz w nowym oknie"
>
  <ExternalLink className="h-3.5 w-3.5" />
  Podgląd rzeczywisty
</Button>
```

### Zmiana 2: MarginHandle.tsx

```tsx
// Nowy komponent do przeciągania marginu
interface MarginHandleProps {
  currentMargin: string;
  onMarginChange: (newMargin: string) => void;
  isVisible: boolean;
}

export const MarginHandle: React.FC<MarginHandleProps> = ({
  currentMargin,
  onMarginChange,
  isVisible
}) => {
  // Uchwyt na górze elementu
  // Mouse/touch events do przeciągania
  // Wyświetlenie wartości podczas drag
  // onMarginChange z nową wartością po zakończeniu
};
```

### Integracja w HtmlElementRenderer.tsx

```tsx
// Po linii ~220 (przed renderowaniem głównego elementu)
{isEditMode && isSelected && onUpdate && (
  <MarginHandle
    currentMargin={element.styles.marginTop || '0px'}
    onMarginChange={(newMargin) => {
      onUpdate({
        styles: { ...element.styles, marginTop: newMargin }
      });
    }}
    isVisible={isSelected}
  />
)}
```

---

## Pliki do modyfikacji/utworzenia

| Plik | Zmiana |
|------|--------|
| `HtmlHybridEditor.tsx` | Dodanie funkcji `openRealPreview` i przycisku w pasku zakładek |
| `MarginHandle.tsx` | **Nowy** - komponent przeciągalnego uchwytu marginu |
| `HtmlElementRenderer.tsx` | Dodanie uchwytu marginu dla zaznaczonych elementów |

---

## Oczekiwane rezultaty

1. **Przycisk "Podgląd rzeczywisty"** obok "Pełny podgląd" otwiera nowe okno przeglądarki z identycznym wyglądem strony
2. **Uchwyt na górnej krawędzi** zaznaczonego elementu pozwala przeciągnąć i zmienić marginTop
3. Wizualny feedback podczas przeciągania (aktualna wartość marginu w pikselach)
4. Zmiana zapisywana do stylów elementu po zakończeniu przeciągania

