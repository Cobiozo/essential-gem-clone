
# Plan: Ulepszenia edytora HTML - resizing obrazków, konwersja na kolumny, wstawianie wideo

## Diagnoza problemów

### 1. Brak możliwości resizowania obrazków za rogi
Aktualnie w edytorze HTML nie ma wizualnych uchwytów do zmiany rozmiaru obrazków. Użytkownik musi ręcznie wpisywać wartości width/height w panelu właściwości.

### 2. Brak opcji konwersji kontenera na kolumny
Gdy użytkownik zaznacza istniejący kontener (div), nie ma szybkiej opcji przekształcenia go w układ 2 lub 3 kolumn. Obecnie można to zrobić tylko przez ręczną edycję klas CSS.

### 3. Wideo w kontenerach z placeholderem nie działa
**Przyczyna**: Miejsca oznaczone jako "[Miejsce na krótkie wideo wprowadzające]" to elementy `<div>`, nie `<video>`. Panel właściwości dla kontenerów pokazuje tylko opcje tła (obrazek), nie wideo. Użytkownik nie może wstawić wideo bezpośrednio do takiego kontenera.

---

## Plan rozwiązań

### Zmiana 1: Uchwyty resizowania dla obrazków i grafik

**Plik**: `src/components/admin/html-editor/HtmlElementRenderer.tsx`

Dodam uchwyty resize'u (corner handles) dla elementów typu `img`, które pozwolą na interaktywną zmianę rozmiaru:

1. Dodanie uchwytów w rogach obrazka (podobnych do tych w `ResizableElement.tsx`)
2. Obsługa przeciągania myszy do zmiany rozmiaru
3. Aktualizacja stylów `width` i `height` elementu po zakończeniu resize'u

Będzie to wyglądać tak:
- 4 uchwyty w rogach obrazka (widoczne po najechaniu w trybie edycji)
- Kursor zmienia się na odpowiedni resize cursor
- Po zwolnieniu przycisku, wymiary są zapisywane do stylów elementu

### Zmiana 2: Opcja konwersji kontenera na kolumny

**Plik**: `src/components/admin/html-editor/HtmlPropertiesPanel.tsx`

W zakładce "Style" dla kontenerów (sekcja Layout) dodam nową sekcję "Szybkie układy" z przyciskami:

- **2 kolumny** - ustawia `display: grid`, `gridTemplateColumns: repeat(2, 1fr)`, `gap: 1rem`
- **3 kolumny** - ustawia `display: grid`, `gridTemplateColumns: repeat(3, 1fr)`, `gap: 1rem`
- **Reset** - przywraca `display: block`

Użytkownik po kliknięciu w kontener będzie mógł jednym kliknięciem zmienić go na układ wielokolumnowy.

### Zmiana 3: Opcja wstawiania wideo do kontenera

**Plik**: `src/components/admin/html-editor/HtmlPropertiesPanel.tsx`

Dodam nową sekcję w zakładce "Media" dla kontenerów:

**"Wstaw wideo do kontenera"**
- Przycisk "Wstaw element wideo wewnątrz"
- Po kliknięciu doda element `<video>` jako dziecko kontenera
- Automatycznie otworzy panel upload wideo

Dodatkowo rozszerzę `handleMediaUpload` aby obsługiwał przypadek wstawiania wideo do kontenera (nie tylko jako tło, ale jako element potomny).

---

## Szczegóły techniczne

### Dla Zmiany 1 (Resize obrazków):

Nowy komponent `ResizableImageWrapper` lub rozszerzenie `HtmlElementRenderer`:

```text
Logika:
1. Wykryj element img w trybie edycji
2. Renderuj uchwyty w rogach (4 małe kwadraty)
3. Na mousedown/touchstart rozpocznij resize
4. Na mousemove/touchmove oblicz nowe wymiary (zachowując proporcje opcjonalnie)
5. Na mouseup/touchend wywołaj onUpdate z nowymi stylami width/height
```

### Dla Zmiany 2 (Konwersja na kolumny):

Lokalizacja: Po sekcji "Layout (Flexbox/Grid)" dodać nową sekcję:

```text
"Szybkie układy" z przyciskami:
┌─────────────────────────────────────┐
│ [1 kol.] [2 kol.] [3 kol.] [Flex]  │
└─────────────────────────────────────┘
```

Każdy przycisk ustawia odpowiednie style w jednym wywołaniu `onUpdate`.

### Dla Zmiany 3 (Wideo w kontenerze):

W zakładce "Media" dla kontenerów, po sekcji "Tło kontenera":

```text
"Wstaw wideo"
┌─────────────────────────────────────┐
│ [Wstaw element <video>]            │
│ Po kliknięciu doda wideo wewnątrz  │
│ kontenera jako dziecko             │
└─────────────────────────────────────┘
```

Wymaga przekazania callback `onInsertChild` do panelu właściwości.

---

## Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `HtmlElementRenderer.tsx` | Dodanie uchwytów resize dla obrazków |
| `HtmlPropertiesPanel.tsx` | Sekcja "Szybkie układy" + "Wstaw wideo" dla kontenerów |
| `HtmlHybridEditor.tsx` | Przekazanie callback do wstawiania dzieci |
| (opcjonalnie) Nowy komponent `ResizableImage.tsx` | Jeśli logika będzie zbyt złożona |

---

## Oczekiwane rezultaty

1. **Obrazki** będą miały uchwyty w rogach do interaktywnej zmiany rozmiaru
2. **Kontenery** będą miały przyciski do szybkiej konwersji na 2/3 kolumny
3. **Placeholdery wideo** (kontenery z tekstem "[Miejsce na wideo]") pozwolą na wstawienie elementu `<video>` wewnątrz
4. Wszystkie zmiany zachowują istniejącą funkcjonalność (podwójne kliknięcie do edycji, drag-and-drop)
