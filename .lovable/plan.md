

# Naprawa podgladu certyfikatow

## Zidentyfikowane problemy

1. **Klasa CSS `max-w-full h-auto` na canvasie Fabric.js** - Fabric.js tworzy wlasny wrapper wokol elementu canvas. Klasy CSS na oryginalnym elemencie `<canvas>` moga powodowac znieksztalcenia wizualne, bo CSS skaluje obraz ale Fabric.js wewnetrznie operuje na oryginalnych wymiarach pikseli. Edytor moze wygladac "scisniety" lub przeskalowany w niewlasciwy sposob.

2. **Szerokosc tekstu w podgladzie** - Funkcja `collectElementsForPreview` pobiera dynamiczna szerokosc IText z Fabric.js (`textObj.width * textObj.scaleX`). Ta szerokosc zmienia sie w zaleznosci od dlugosci wpisanego tekstu. CertificatePreview uzywa tej szerokosci do obliczania pozycji dla tekstu wycentrowanego (`textX = x + width / 2`). Dla krotkich placeholderow jak `{userName}` szerokosc jest mala, a po zastapieniu dlugim imieniem tekst moze sie przesunac lub zle zawinac.

3. **Podglad za maly** - Skala podgladu to ~47.5% (400/842), co daje obraz 400x283px - trudny do porownania z editorem i za maly zeby ocenic poprawnosc renderowania.

4. **Brak synchronizacji po ladowaniu obrazow** - Poczatkowe zbieranie elementow (`setTimeout 500ms`) moze sie odpalic zanim obrazy w Fabric.js sie zaladuja. Wprawdzie event `object:added` tez triggeruje update, ale moze dojsc do bledow timingu.

## Rozwiazanie

### 1. Naprawic wyswietlanie canvasu Fabric.js w edytorze

Usunac `max-w-full h-auto` z canvas element. Zamiast tego, uzyc wrappera z `transform: scale()` ktory skaluje canvas responsywnie bez zaburzania wewnetrznych wymiarow Fabric.js.

```text
Przed:
<canvas ref={canvasRef} className="shadow-lg max-w-full h-auto" />

Po:
<div style={{ transform: `scale(${containerScale})`, transformOrigin: 'top left' }}>
  <canvas ref={canvasRef} className="shadow-lg" />
</div>
```

Dodac obliczanie `containerScale` na podstawie dostepnej szerokosci kontenera z uzyciem `ResizeObserver`.

### 2. Poprawic zbieranie szerokosci tekstu dla podgladu

W `collectElementsForPreview` - dla tekstu z `noWrap: true`, uzywac zapisanej oryginalnej szerokosci elementu (z template data) zamiast dynamicznej szerokosci IText. Dodac przechowywanie oryginalnych wymiarow w metadanych obiektu Fabric.js.

```typescript
// Przy tworzeniu/ladowaniu elementu:
(text as any).originalWidth = element.width || 400;

// W collectElementsForPreview:
width: (textObj as any).originalWidth || 
       (textObj.width || 200) * (textObj.scaleX || 1),
```

### 3. Zwiekszyc rozmiar podgladu

Zmienic skale podgladu z `Math.min(400 / canvasWidth, 1)` na wieksza wartosc, np. `Math.min(500 / canvasWidth, 1)` lub dynamicznie dopasowac do dostepnej przestrzeni.

### 4. Poprawic synchronizacje po zaladowaniu obrazow

Zwiekszyc poczatkowy timeout z 500ms do 1500ms i dodac dodatkowy trigger po zaladowaniu wszystkich elementow.

## Zmiany techniczne

| Plik | Zmiana |
|------|--------|
| `src/components/admin/TemplateDndEditor.tsx` | Usunac `max-w-full h-auto` z canvas, dodac wrapper z `transform: scale()`, dodac `ResizeObserver`, zapisywac `originalWidth` na obiektach IText |
| `src/components/admin/CertificatePreview.tsx` | Zwiekszyc skale podgladu, uzyc `originalWidth` dla tekstu noWrap |

## Efekt

- Canvas edytora bedzie sie poprawnie skalowac bez znieksztalcen
- Podglad bedzie wiernie odzwierciedlal pozycje tekstu (szczegolnie wycentrowanego)
- Podglad bedzie wiekszy i czytelniejszy
- Elementy beda zsynchronizowane po pelnym zaladowaniu obrazow

