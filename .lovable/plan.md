

# Naprawa złotej ikonki selektora dat

## Problem
Klasy Tailwind `[&::-webkit-calendar-picker-indicator]` z filtrami CSS są dodawane przez `className` prop, ale komponent `Input` używa `cn()` (tailwind-merge), który scala klasy. Problem: te pseudo-element selektory mogą nie działać poprawnie przez Tailwind — filtry `brightness-0 invert sepia saturate hue-rotate` wymagają odpowiedniej kolejności i mogą być usuwane lub źle mergowane.

## Rozwiązanie
Dodać style globalnie w `src/App.css` (lub `index.css`) za pomocą natywnego CSS, który jest pewniejszy niż klasy Tailwind dla pseudo-elementów:

```css
input[type="date"]::-webkit-calendar-picker-indicator {
  filter: brightness(0) invert(1) sepia(1) saturate(10) hue-rotate(15deg);
  cursor: pointer;
}
```

To złapie **wszystkie** inputy date w aplikacji — nie trzeba dodawać className na każdym polu osobno. Dodatkowe `cursor: pointer` poprawi UX.

Opcjonalnie: usunąć zbędne klasy `[&::-webkit-calendar-picker-indicator]` z `PrivateContactForm.tsx` (3 miejsca), bo globalny CSS je zastąpi.

## Pliki do zmiany
- `src/App.css` — dodanie globalnego stylu dla ikonki kalendarza
- `src/components/team-contacts/PrivateContactForm.tsx` — opcjonalne usunięcie zduplikowanych klas (cleanup)

