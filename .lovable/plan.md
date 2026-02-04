
# Plan: Naprawa zmiany obrazka tła w edytorze HTML

## Diagnoza problemu

Po przesłaniu obrazka do kontenera (zamiast logo z literą "E"), wyświetla się komunikat "Zdjęcie zostało przesłane", ale obrazek nie pojawia się. Przyczyna:

### Błąd w kodzie
W pliku `src/components/admin/html-editor/HtmlPropertiesPanel.tsx` funkcja `handleMediaUpload` (linie 86-97) wywołuje **trzy oddzielne** aktualizacje stylów:

```tsx
updateStyle('backgroundImage', `url(${url})`);
updateStyle('backgroundSize', 'cover');
updateStyle('backgroundPosition', 'center');
```

**Problem:** Każde wywołanie `updateStyle` używa `element.styles` z momentu początkowego renderowania komponentu. React nie aktualizuje props między synchronicznymi wywołaniami, więc:
1. Pierwsze wywołanie: `{ ...element.styles, backgroundImage: 'url(...)' }`
2. Drugie wywołanie: `{ ...element.styles, backgroundSize: 'cover' }` ← używa **starego** `element.styles` (bez backgroundImage!)
3. Trzecie wywołanie: `{ ...element.styles, backgroundPosition: 'center' }` ← używa **starego** `element.styles`

**Efekt:** Tylko `backgroundPosition: 'center'` zostaje zapisane, nadpisując wszystkie poprzednie zmiany. Obrazek tła nigdy nie jest faktycznie ustawiony.

---

## Rozwiązanie

### Zmiana w `HtmlPropertiesPanel.tsx`

Zmienić funkcję `handleMediaUpload` aby ustawiała wszystkie style w **jednym wywołaniu** `onUpdate`:

**Przed:**
```tsx
const handleMediaUpload = (url: string, type: string) => {
  if (element.tagName === 'img') {
    updateAttribute('src', url);
  } else if (element.tagName === 'video') {
    updateAttribute('src', url);
  } else {
    updateStyle('backgroundImage', `url(${url})`);
    updateStyle('backgroundSize', 'cover');
    updateStyle('backgroundPosition', 'center');
  }
};
```

**Po:**
```tsx
const handleMediaUpload = (url: string, type: string) => {
  if (element.tagName === 'img') {
    updateAttribute('src', url);
  } else if (element.tagName === 'video') {
    updateAttribute('src', url);
  } else {
    // Set all background styles in a single update to avoid race condition
    onUpdate({
      styles: {
        ...element.styles,
        backgroundImage: `url(${url})`,
        backgroundSize: element.styles.backgroundSize || 'cover',
        backgroundPosition: element.styles.backgroundPosition || 'center',
        backgroundRepeat: element.styles.backgroundRepeat || 'no-repeat'
      }
    });
  }
};
```

---

## Dodatkowa weryfikacja

Sprawdzę również inne miejsca w edytorze, gdzie mogą występować podobne problemy z wielokrotnymi wywołaniami `updateStyle` lub `updateAttribute` w sekwencji, i naprawię je wszystkie.

---

## Oczekiwany rezultat

1. Po przesłaniu obrazka tła do kontenera, obrazek będzie widoczny natychmiast
2. Wszystkie style tła (`backgroundImage`, `backgroundSize`, `backgroundPosition`) będą ustawiane jednocześnie
3. Zmiana obrazka będzie działać prawidłowo bez konieczności odświeżania strony

---

## Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/components/admin/html-editor/HtmlPropertiesPanel.tsx` | Naprawa `handleMediaUpload` - jedna aktualizacja zamiast trzech |
