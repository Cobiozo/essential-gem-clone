
# Plan: Naprawa wyświetlania wideo i zachowanie proporcji przy resizowaniu obrazków

## Podsumowanie problemów

### Problem 1: Wideo nie jest widoczne po przesłaniu
**Przyczyna:** W pliku `HtmlElementRenderer.tsx` brakuje dedykowanej obsługi tagu `<video>`. Obrazki mają specjalną logikę (linie 147-173), ale wideo jest renderowane generycznie. Co więcej, `tagProps` nie przekazuje atrybutów z `element.attributes`, więc `src` wideo nigdy nie trafia do DOM.

### Problem 2: Zmniejszanie obrazka nie zachowuje proporcji
**Przyczyna:** W `ResizableImageWrapper.tsx` szerokość i wysokość są obliczane niezależnie. Brak blokady proporcji powoduje zniekształcenie obrazka.

---

## Rozwiązanie 1: Dedykowane renderowanie wideo

**Plik**: `src/components/admin/html-editor/HtmlElementRenderer.tsx`

Dodam dedykowaną obsługę `<video>` w funkcji `renderContent()`, podobną do obrazków:

```text
Dodaj po obsłudze 'img' (po linii 173):

if (element.tagName === 'video') {
  return (
    <video 
      src={element.attributes.src}
      controls={element.attributes.controls !== 'false'}
      autoPlay={element.attributes.autoplay === 'true'}
      muted={element.attributes.muted === 'true'}
      loop={element.attributes.loop === 'true'}
      className={element.attributes.class}
      style={inlineStyles}
    />
  );
}
```

To zapewni, że atrybut `src` z przesłanego wideo będzie poprawnie przekazany do elementu DOM, a wideo będzie widoczne.

---

## Rozwiązanie 2: Blokada proporcji przy resizowaniu

**Plik**: `src/components/admin/html-editor/ResizableImageWrapper.tsx`

Zmienię logikę `handleMouseMove` aby zachowywać proporcje (aspect ratio):

```text
Aktualna logika (problem):
- deltaX i deltaY są używane niezależnie
- Każdy róg zmienia oba wymiary w różnych kierunkach

Nowa logika (rozwiązanie):
1. Oblicz początkowy aspect ratio: aspectRatio = startWidth / startHeight
2. Przy przeciąganiu użyj tylko WIĘKSZEGO delta (X lub Y)
3. Oblicz drugi wymiar z proporcji

Przykład dla rogu SE (prawy dolny):
- Nowa szerokość = startWidth + deltaX
- Nowa wysokość = newWidth / aspectRatio
```

Dodatkowo zachowam `aspectRatio` w `useRef` aby proporcje były blokowane od momentu rozpoczęcia resizowania.

---

## Szczegóły implementacji

### Zmiana w HtmlElementRenderer.tsx

W funkcji `renderContent()` po bloku obsługującym obrazki, dodam:

```tsx
if (element.tagName === 'video') {
  const videoSrc = element.attributes.src;
  
  // Pokaż placeholder jeśli brak src
  if (!videoSrc) {
    return (
      <div className="flex items-center justify-center bg-muted/50 border-2 border-dashed rounded-lg p-8">
        <div className="text-center text-muted-foreground">
          <Video className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Wybierz wideo w panelu Media</p>
        </div>
      </div>
    );
  }
  
  return (
    <video 
      src={videoSrc}
      controls
      className={element.attributes.class}
      style={{ ...inlineStyles, maxWidth: '100%' }}
    >
      Twoja przeglądarka nie obsługuje wideo.
    </video>
  );
}
```

### Zmiana w ResizableImageWrapper.tsx

W funkcji `handleMouseMove`, zamienię obecną logikę na:

```tsx
const handleMouseMove = useCallback((e: MouseEvent) => {
  if (!isResizing || !activeHandle) return;
  
  const deltaX = e.clientX - startPos.current.x;
  const deltaY = e.clientY - startPos.current.y;
  
  // Oblicz aspect ratio
  const aspectRatio = startSize.current.width / startSize.current.height;
  
  let newWidth = startSize.current.width;
  let newHeight = startSize.current.height;
  
  // Użyj dominującego delta i zachowaj proporcje
  switch (activeHandle) {
    case 'se':
    case 'ne':
      // Dla prawych rogów - szerokość jest główna
      newWidth = Math.max(20, startSize.current.width + deltaX);
      newHeight = newWidth / aspectRatio;
      break;
    case 'sw':
    case 'nw':
      // Dla lewych rogów - szerokość jest główna (ale odejmujemy)
      newWidth = Math.max(20, startSize.current.width - deltaX);
      newHeight = newWidth / aspectRatio;
      break;
  }
  
  // Minimum height
  newHeight = Math.max(20, newHeight);
  
  // Wizualna aktualizacja
  if (wrapperRef.current) {
    wrapperRef.current.style.width = `${newWidth}px`;
    wrapperRef.current.style.height = `${newHeight}px`;
  }
}, [isResizing, activeHandle]);
```

---

## Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `HtmlElementRenderer.tsx` | Dodanie dedykowanej obsługi `<video>` z przekazaniem `src` |
| `ResizableImageWrapper.tsx` | Blokada proporcji przy resizowaniu obrazków |

---

## Oczekiwane rezultaty

1. **Wideo** będzie widoczne natychmiast po przesłaniu - atrybut `src` będzie poprawnie przekazany
2. **Obrazki** przy zmniejszaniu/powiększaniu za rogi zachowają swoje proporcje
3. Brak zniekształceń grafik przy interaktywnym resizowaniu
