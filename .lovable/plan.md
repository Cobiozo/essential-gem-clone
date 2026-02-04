
# Plan: Naprawa edytora HTML - podgląd, edycja stylów, uproszczony interfejs

## Zidentyfikowane problemy

### Problem 1: Szerokość kontenera nie widać w podglądzie rzeczywistym
**Przyczyna:** Użytkownik wpisuje "1000" ale style wymagają jednostek "1000px". Dodatkowo, podgląd rzeczywisty czyta z `codeValue` który może nie być zsynchronizowany z najnowszymi zmianami.

### Problem 2: Edytor zamyka się po wpisaniu jednej cyfry/litery
**Przyczyna:** Każde naciśnięcie klawisza wywołuje `updateStyle()` → `onUpdate()` → `syncAndSave()` → pełny re-render komponentu. To powoduje utratę focusu na polu Input.

### Problem 3: Edytor jest zbyt skomplikowany
**Przyczyna:** Za dużo opcji CSS z technicznym nazewnictwem, brak wizualnych kontrolek, nieprzyjazny dla laików.

---

## Rozwiązania

### Rozwiązanie 1: Automatyczne dodawanie jednostek "px"

Dodam helper function w `HtmlPropertiesPanel.tsx` który automatycznie dodaje "px" do wartości liczbowych:

```text
Nowa funkcja:
const normalizeStyleValue = (key: string, value: string) => {
  // Dla wymiarów - dodaj 'px' jeśli to sama liczba
  const dimensionProps = ['width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight', 
                          'margin', 'padding', 'gap', 'borderRadius'];
  
  if (dimensionProps.includes(key) && /^\d+$/.test(value.trim())) {
    return value.trim() + 'px';
  }
  return value;
};
```

### Rozwiązanie 2: Debounce dla pól Input (zapobiega re-renderom)

Zamiast natychmiastowego `onUpdate` przy każdym keystroke, dodam:

1. **Lokalne state dla wartości** - przechowuje tekst wpisywany przez użytkownika
2. **Debounced save** - zapisuje do głównego stanu po 500ms bez aktywności
3. **Blur save** - zapisuje natychmiast gdy użytkownik opuści pole

```text
Nowy komponent: DebouncedStyleInput
- Przechowuje lokalną wartość input
- Wywołuje updateStyle dopiero po debounce lub onBlur
- Zapobiega utracie focusu podczas edycji
```

### Rozwiązanie 3: Uproszczony, wizualny panel edycji

Zaprojektuję nowy panel z podejściem "dziecko może obsłużyć":

```text
NOWY UKŁAD PANELU:

┌──────────────────────────────────────────────────┐
│  📦 Rozmiar                                       │
│  ┌────────────────────────────────────────────┐  │
│  │    Szerokość: [====●==========] 400px      │  │
│  │    Wysokość:  [=●===============] auto     │  │
│  └────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────┤
│  🎨 Wygląd                                        │
│  ┌────────────────────────────────────────────┐  │
│  │  Kolor tła: [■] #1a1a2e   Tekst: [■] #fff  │  │
│  │                                             │  │
│  │  Zaokrąglenie: [○] [●] [○] [○]             │  │
│  │     (brak)  (małe) (śr.) (duże)            │  │
│  │                                             │  │
│  │  Cień: [○] [●] [○]                         │  │
│  │       (brak) (mały) (duży)                 │  │
│  └────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────┤
│  📏 Odstępy                                       │
│  ┌────────────────────────────────────────────┐  │
│  │      Zewnętrzny (margin):                   │  │
│  │           [ ↑ 20px ]                        │  │
│  │      [←10]  ELEMENT  [10→]                  │  │
│  │           [ ↓ 20px ]                        │  │
│  │                                             │  │
│  │      Wewnętrzny (padding):                  │  │
│  │           [ ↑ 16px ]                        │  │
│  │      [←24]  treść   [24→]                   │  │
│  │           [ ↓ 16px ]                        │  │
│  └────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────┤
│  ⚡ Zaawansowane (ukryte domyślnie)               │
│  [Rozwiń opcje dla ekspertów ▼]                  │
└──────────────────────────────────────────────────┘
```

---

## Szczegóły implementacji

### 1. Nowy komponent: DebouncedStyleInput

Plik: `src/components/admin/html-editor/DebouncedStyleInput.tsx`

```tsx
const DebouncedStyleInput = ({ 
  value, 
  onChange, 
  onFinalChange,  // Wywoływane po debounce lub blur
  normalizeValue,
  ...props 
}) => {
  const [localValue, setLocalValue] = useState(value);
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  // Sync gdy zewnętrzna wartość się zmieni (ale nie gdy edytujemy)
  useEffect(() => {
    if (!document.activeElement?.isSameNode(inputRef.current)) {
      setLocalValue(value);
    }
  }, [value]);
  
  const handleChange = (e) => {
    setLocalValue(e.target.value);
    
    // Debounce
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      const normalized = normalizeValue?.(e.target.value) || e.target.value;
      onFinalChange(normalized);
    }, 500);
  };
  
  const handleBlur = () => {
    clearTimeout(timeoutRef.current);
    const normalized = normalizeValue?.(localValue) || localValue;
    onFinalChange(normalized);
  };
  
  return <Input value={localValue} onChange={handleChange} onBlur={handleBlur} {...props} />;
};
```

### 2. Uproszczona sekcja wymiarów z suwakami

```tsx
// Przykład wizualnego suwaka dla szerokości
<div className="space-y-2">
  <Label className="flex justify-between">
    <span>Szerokość</span>
    <span className="text-muted-foreground">{element.styles.width || 'auto'}</span>
  </Label>
  <div className="flex gap-2 items-center">
    <Slider
      value={[parseFloat(element.styles.width) || 100]}
      onValueChange={([v]) => updateStyle('width', `${v}%`)}
      min={10}
      max={100}
      step={5}
    />
    <Button 
      variant="ghost" 
      size="sm"
      onClick={() => updateStyle('width', 'auto')}
    >
      Auto
    </Button>
  </div>
</div>
```

### 3. Wizualne kontrolki odstępów (margin/padding)

```tsx
// Wizualna reprezentacja box model
<div className="relative border-2 border-dashed p-4 rounded-lg">
  <div className="text-center text-xs text-muted-foreground mb-2">
    MARGIN (zewnętrzny)
  </div>
  <div className="flex justify-center gap-2 mb-2">
    <DebouncedStyleInput
      value={element.styles.marginTop}
      className="w-16 text-center text-xs"
      placeholder="0"
    />
  </div>
  <div className="flex items-center justify-between">
    <DebouncedStyleInput value={element.styles.marginLeft} className="w-16" />
    
    <div className="bg-muted/50 border rounded p-3 text-center">
      <div className="text-xs mb-1">PADDING</div>
      {/* ... padding inputs ... */}
      <div className="bg-background border rounded p-2 text-xs">
        treść
      </div>
    </div>
    
    <DebouncedStyleInput value={element.styles.marginRight} className="w-16" />
  </div>
</div>
```

### 4. Preset buttons dla częstych wartości

```tsx
// Zamiast wpisywania - klikalne presety
<div className="space-y-2">
  <Label>Zaokrąglenie rogów</Label>
  <div className="grid grid-cols-4 gap-1">
    {[
      { label: 'Brak', value: '0' },
      { label: 'Małe', value: '4px' },
      { label: 'Średnie', value: '8px' },
      { label: 'Duże', value: '16px' },
      { label: 'Okrągłe', value: '9999px' }
    ].map(preset => (
      <Button
        key={preset.value}
        variant={element.styles.borderRadius === preset.value ? 'default' : 'outline'}
        size="sm"
        onClick={() => updateStyle('borderRadius', preset.value)}
      >
        {preset.label}
      </Button>
    ))}
  </div>
</div>
```

---

## Pliki do modyfikacji/utworzenia

| Plik | Zmiana |
|------|--------|
| `DebouncedStyleInput.tsx` | **Nowy** - input z debounce do edycji stylów |
| `HtmlPropertiesPanel.tsx` | Kompletny redesign - uproszczony, wizualny interfejs |
| `HtmlHybridEditor.tsx` | Synchronizacja codeValue z elements przy zmianach |
| `VisualSpacingEditor.tsx` | **Nowy** - wizualna edycja margin/padding |
| `StylePresets.tsx` | **Nowy** - presety dla częstych wartości |

---

## Kluczowe zmiany UX

1. **Sliders zamiast input tekstowych** dla wymiarów i odstępów
2. **Presety jednym kliknięciem** (małe/średnie/duże zaokrąglenie, cień, itp.)
3. **Wizualna reprezentacja box model** dla margin/padding
4. **Color pickery** z podglądem na żywo
5. **Sekcja "Zaawansowane" ukryta domyślnie** - dla ekspertów
6. **Natychmiastowy podgląd** - bez utraty focusu podczas edycji
7. **Automatyczne jednostki** - wpisz "100", dostaniesz "100px"

---

## Oczekiwane rezultaty

1. **Szerokość widoczna w podglądzie** - automatyczne dodawanie "px"
2. **Brak zamykania edytora** - debounce zapobiega re-renderom
3. **Intuicyjny interfejs** - suwaki, presety, wizualizacje zamiast technicznych pól
4. **Real-time preview** - zmiany widoczne natychmiast
5. **Dostępność** - nawet dziecko może zmienić rozmiar przeciągając suwak

