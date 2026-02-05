
# Plan naprawy edytora HTML

## Zidentyfikowane problemy

### 1. Edytor zamyka się/wyłącza po zmianach (niestabilność)

**Przyczyna główna:** W `HtmlHybridEditor.tsx` linia 693:
```tsx
element={findElementById(elements, selectedElementId)}
```

Przy każdej aktualizacji elementów (`syncAndSave`), następuje ponowne obliczenie `findElementById`, co może zwrócić `null` na moment (gdy elementy się aktualizują), powodując zamknięcie panelu właściwości.

**Rozwiązanie:** Użycie `useMemo` z zależnością od `selectedElementId` zamiast bezpośredniego wywołania funkcji w render:

```tsx
const selectedElement = useMemo(() => {
  return selectedElementId ? findElementById(elements, selectedElementId) : null;
}, [elements, selectedElementId, findElementById]);
```

I przekazanie `selectedElement` zamiast `findElementById(...)`.

---

### 2. Panel boczny zajmuje za dużo miejsca

**Obecny stan:** Panel boczny ma `defaultSize={40}` (40% szerokości) - linia 691.

**Rozwiązanie:** Zmiana na `defaultSize={35}` lub `defaultSize={30}` dla mniejszego panelu i zwiększenie `minSize` edytora do 50-55%.

---

### 3. Wideo niewidoczne po dodaniu (placeholder zamiast podglądu)

**Przyczyna:** W `HtmlElementRenderer.tsx` linie 190-199, gdy `videoSrc` jest puste lub brak atrybutu `src`, renderowany jest placeholder. Ale nawet gdy `src` jest ustawione, wideo nie jest widoczne od razu.

**Problem:** Po wybraniu wideo w MediaUpload, `src` jest ustawiane, ale renderowanie może nie aktualizować się poprawnie przez shallow comparison w `React.memo`.

**Rozwiązanie:** 
- Upewnić się, że komparator w `React.memo` (linia 369-384) prawidłowo wykrywa zmiany `attributes.src`
- Dodać natychmiastowy podgląd wideo z kontrolkami odtwarzania zaraz po ustawieniu URL

---

### 4. Przycisk bez możliwości przypisania linku

**Obecny stan:** W `SimplifiedPropertiesPanel.tsx` sekcja "Treść" (linie 767-795) obsługuje tylko elementy typu `link` (tag `<a>`), ale NIE przyciski (`<button>`).

**Problem:** Gdy dodajesz `<button>` element w edytorze HTML, panel właściwości nie oferuje opcji konfiguracji linku, ponieważ kod sprawdza tylko `elementType === 'link'`.

**Rozwiązanie:** Rozszerzyć logikę o obsługę `elementType === 'button'` z pełnym edytorem linków podobnym do Layout Editor:
- Typ linku: wewnętrzny/zewnętrzny/zasób/akcja
- Opcje: otwórz w nowej karcie, pobierz, kopiuj do schowka, nawigacja
- Pobranie listy stron z bazy danych do wyboru

---

### 5. Wyrównanie tekstu nie działa dla elementów tekstowych

**Obecny stan:** W `SimplifiedPropertiesPanel.tsx` linie 744-763, przyciski wyrównania są obecne ale działają tylko dla lokalnego stanu `localStyles.textAlign`.

**Problem:** Przyciski wyrównania aktualizują `localStyles`, ale użytkownik mógł kliknąć element, który jest zagnieżdżony w kontenerze - wyrównanie powinno być stosowane do rodzica lub wymaga `display: block`.

**Rozwiązanie:**
- Upewnić się, że `textAlign` jest aplikowane poprawnie do elementu
- Dla elementów inline (`span`, `strong`, `em`) - automatycznie konwertować na `display: block` lub stosować wyrównanie do rodzica

---

## Plan implementacji

### Pliki do modyfikacji

| Plik | Zmiany |
|------|--------|
| `HtmlHybridEditor.tsx` | 1. Dodać `useMemo` dla `selectedElement` 2. Zmienić `defaultSize` panelu na 32% |
| `SimplifiedPropertiesPanel.tsx` | 1. Dodać sekcję linków dla przycisków (`button`) 2. Naprawić wyrównanie dla inline elementów |
| `HtmlElementRenderer.tsx` | 1. Poprawić podgląd wideo 2. Zaktualizować komparator `React.memo` |

---

## Szczegółowe zmiany

### 1. `HtmlHybridEditor.tsx`

**A) Stabilizacja selekcji (linie ~690-700):**

Przed panelem właściwości dodać memoizację:
```tsx
const selectedElement = useMemo(() => {
  if (!selectedElementId) return null;
  return findElementById(elements, selectedElementId);
}, [elements, selectedElementId, findElementById]);
```

Następnie przekazać:
```tsx
<SimplifiedPropertiesPanel
  element={selectedElement}
  ...
/>
```

**B) Mniejszy panel (linia 691):**
```tsx
<ResizablePanel defaultSize={32} minSize={25} maxSize={45}>
```

### 2. `SimplifiedPropertiesPanel.tsx`

**Dodanie sekcji Link dla przycisków (po linii 795):**

Nowa sekcja obsługująca:
- Typ linku: zewnętrzny URL, strona wewnętrzna, zasób do pobrania, akcja kopiowania
- Przycisk "Otwórz w nowej karcie"
- Pobieranie listy stron z Supabase
- Atrybut `data-action` dla akcji JS (kopiuj, pobierz)

### 3. `HtmlElementRenderer.tsx`

**Poprawka wideo (linie 176-215):**

Upewnić się, że wideo z `src` renderuje się natychmiast:
```tsx
if (element.tagName === 'video') {
  let videoSrc = element.attributes.src;
  
  // Check child <source> as fallback
  if (!videoSrc && element.children.length > 0) {
    const sourceChild = element.children.find(c => c.tagName === 'source');
    if (sourceChild) {
      videoSrc = sourceChild.attributes.src;
    }
  }
  
  // Show placeholder ONLY if truly no source
  if (!videoSrc) {
    return (/* placeholder */);
  }
  
  // Always render video with controls
  return (
    <video 
      key={videoSrc} // Force re-render on src change
      src={videoSrc}
      controls
      controlsList="nodownload"
      ...
    />
  );
}
```

### 4. Poprawka wyrównania tekstu

W sekcji "Wyrównanie" - dodanie automatycznego `display: block` dla inline elementów przy zmianie wyrównania, lub stosowanie wyrównania via Flexbox na kontener:

```tsx
onClick={() => {
  const updates: Record<string, string> = { textAlign: value };
  // For inline elements, add display block to enable text-align
  if (['span', 'strong', 'em', 'b', 'i', 'u'].includes(element?.tagName.toLowerCase() || '')) {
    updates.display = 'block';
  }
  Object.entries(updates).forEach(([k, v]) => updateStyle(k, v));
}}
```

---

## Podsumowanie zmian

| Problem | Rozwiązanie | Priorytet |
|---------|-------------|-----------|
| Zamykanie panelu | `useMemo` dla selectedElement | Krytyczny |
| Panel za szeroki | `defaultSize={32}` | Niski |
| Wideo niewidoczne | `key={videoSrc}` + poprawka source | Wysoki |
| Brak linku w przycisku | Nowa sekcja Button Link Editor | Wysoki |
| Wyrównanie nie działa | `display: block` dla inline | Średni |
