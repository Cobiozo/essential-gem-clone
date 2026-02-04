

# Plan: Naprawa wyświetlania wideo w edytorze HTML

## Zidentyfikowane problemy

### Problem 1: Wideo widoczne w podglądzie, ale nie w edytorze
**Przyczyna:** Szablon wideo używa struktury `<video><source src="" /></video>`, gdzie URL jest w dziecku `<source>`, a `HtmlElementRenderer` szuka `element.attributes.src` bezpośrednio na elemencie `<video>`. W podglądzie (serializowany HTML) wszystko działa, bo przeglądarka poprawnie interpretuje `<source>`.

### Problem 2: Brak kontrolek odtwarzania i możliwość pobierania
**Przyczyna:** Serializer nie dodaje atrybutów `controlsList="nodownload"` ani `disablePictureInPicture`. Renderer w edytorze ma `controls`, ale nie blokuje pobierania.

### Problem 3: Panel wideo w edytorze zapisuje `src` na `<video>`, ale template ma `<source>`
**Przyczyna:** `handleMediaUpload` w `SimplifiedPropertiesPanel` zapisuje URL do `localAttributes.src`, co jest poprawne dla prostego `<video src="...">`, ale nie dla `<video><source src="..." /></video>`.

---

## Rozwiązania

### Rozwiązanie 1: Zmiana szablonu wideo na prostszą formę

Zmienić template w `HtmlElementToolbar.tsx` na:
```html
<video controls controlslist="nodownload" class="w-full rounded-lg" src=""></video>
```

Zamiast:
```html
<video controls><source src="" /></video>
```

### Rozwiązanie 2: Obsługa wideo z `<source>` w rendererze

W `HtmlElementRenderer.tsx` dodać logikę sprawdzającą czy wideo ma dziecko `<source>`:

```tsx
if (element.tagName === 'video') {
  // Sprawdź src na video lub w dziecku <source>
  let videoSrc = element.attributes.src;
  
  if (!videoSrc && element.children.length > 0) {
    const sourceChild = element.children.find(c => c.tagName === 'source');
    if (sourceChild) {
      videoSrc = sourceChild.attributes.src;
    }
  }
  
  // Renderuj wideo z kontrolkami bez pobierania
  return (
    <video 
      src={videoSrc}
      controls
      controlsList="nodownload"
      disablePictureInPicture
      className={element.attributes.class}
      style={{ ...inlineStyles, maxWidth: '100%' }}
    />
  );
}
```

### Rozwiązanie 3: Serializer - dodaj atrybuty blokujące pobieranie

W `useHtmlSerializer.ts` dodać specjalną obsługę dla `<video>`:

```tsx
const serializeElement = (element: ParsedElement): string => {
  // Dla video - zawsze dodaj controls i controlslist
  if (tagName === 'video') {
    if (!attrParts.some(a => a.includes('controls'))) {
      attrParts.push('controls');
    }
    if (!attrParts.some(a => a.includes('controlslist'))) {
      attrParts.push('controlslist="nodownload"');
    }
  }
  // ...
}
```

### Rozwiązanie 4: Panel właściwości - obsługa dzieci `<source>`

W `SimplifiedPropertiesPanel.tsx` zmienić `handleMediaUpload` dla wideo:

```tsx
} else if (element.tagName === 'video') {
  // Zapisz src bezpośrednio na video
  updateAttribute('src', url);
  
  // Usuń dzieci <source> jeśli istnieją (bo teraz mamy src na video)
  if (element.children.some(c => c.tagName === 'source')) {
    onUpdate({
      attributes: { ...element.attributes, src: url },
      children: element.children.filter(c => c.tagName !== 'source')
    });
  }
}
```

---

## Szczegóły implementacji

### Plik 1: HtmlElementToolbar.tsx (linia 114)

Zmiana szablonu wideo:
```tsx
{
  label: 'Wideo',
  icon: <Video className="w-4 h-4" />,
  html: '<video controls controlslist="nodownload" class="w-full rounded-lg" src=""></video>',
  category: 'media'
}
```

### Plik 2: HtmlElementRenderer.tsx (linie 178-203)

Rozbudowana obsługa wideo z fallback do `<source>`:
- Sprawdzenie `element.attributes.src` 
- Fallback do `element.children.find(c => c.tagName === 'source')?.attributes.src`
- Dodanie `controlsList="nodownload"` i `disablePictureInPicture`
- Pokazanie miniaturki/pierwszej klatki poprzez atrybut `preload="metadata"`

### Plik 3: useHtmlSerializer.ts (linia 14+)

Dla elementów `<video>`:
- Zawsze dodaj `controls` jeśli brak
- Zawsze dodaj `controlslist="nodownload"`
- Obsłuż przypadek gdy `src` jest puste (nie renderuj pustego atrybutu)

### Plik 4: SimplifiedPropertiesPanel.tsx (linia 181)

Poprawiona obsługa uploadu wideo:
- Zapisz URL bezpośrednio na `<video src="">`
- Jeśli element ma dzieci `<source>`, zaktualizuj je lub usuń
- Wyświetl aktualny URL z odpowiedniego źródła

---

## Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `HtmlElementToolbar.tsx` | Zmiana template wideo - prostsze `<video src="" controls>` |
| `HtmlElementRenderer.tsx` | Obsługa src z `<source>`, dodanie `controlsList` |
| `useHtmlSerializer.ts` | Automatyczne dodanie `controls` i `controlslist` dla video |
| `SimplifiedPropertiesPanel.tsx` | Obsługa uploadu i wyświetlania URL z `<source>` |

---

## Oczekiwane rezultaty

1. **Wideo widoczne w edytorze** - pokazuje pierwszą klatkę lub miniaturkę
2. **Kontrolki odtwarzania** - play/pause, postęp, głośność
3. **Brak opcji pobierania** - `controlslist="nodownload"` blokuje przycisk
4. **Zgodność starego i nowego formatu** - obsługa zarówno `<video src="">` jak i `<video><source src=""/></video>`
5. **Spójność** - edytor i podgląd pokazują to samo

