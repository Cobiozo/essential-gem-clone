

## Dodanie struktur tła (patterns/textures) do edytora stron partnerskich

Rozszerzony zestaw wzorów obejmujący zarówno geometryczne patterny, jak i **tekstury materiałowe** (papier, len, materiał, skóra, drewno itp.) — wszystko w CSS/SVG, bez zewnętrznych obrazów.

---

### Pełna lista wzorów (~20)

**Geometryczne:**
dots, diagonal-lines, grid, waves, circles, hexagons, chevrons, cross, diamonds, triangles

**Materiałowe/organiczne:**
paper (tekstura papieru), linen (len), fabric (materiał/tkanina), leather (skóra), wood (drewno), concrete (beton), noise (szum), canvas (płótno), marble (marmur), sand (piasek)

Każdy wzór generowany przez CSS `background-image` (gradienty, repeating patterns, inline SVG data URI z `feTurbulence`/`feDisplacementMap`). Parametr `bg_pattern_opacity` (0–1, domyślnie 0.08).

---

### Nowe pliki

1. **`src/lib/bgPatterns.ts`** — eksportuje:
   - `BG_PATTERNS: Array<{ value, label, category, previewCss, getCss(opacity, color) }>` — pełna mapa wzorów z podziałem na kategorie "Geometryczne" / "Materiały"
   - `getPatternStyle(pattern, opacity, color?): React.CSSProperties` — gotowy styl do nałożenia na overlay div
   - Tekstury materiałowe używają SVG `feTurbulence` z różnymi parametrami (`baseFrequency`, `numOctaves`, `type`) zakodowanymi jako data URI

2. **`src/components/admin/template-sections/BgPatternPicker.tsx`** — komponent pickera:
   - Select z grupami (Geometryczne / Materiały) + miniaturki podglądu wzorów (24x24 px)
   - Slider opacity (0–100%)
   - Opcjonalny color picker dla koloru wzoru
   - Props: `value`, `opacity`, `color`, `onChange(pattern, opacity, color)`

### Modyfikowane pliki

3. **Edytory sekcji** (8 plików) — dodanie `<BgPatternPicker>` obok istniejących pól koloru tła:
   - `HeroSectionEditor.tsx`
   - `TextImageSectionEditor.tsx`
   - `StepsSectionEditor.tsx`
   - `CtaBannerEditor.tsx`
   - `FaqSectionEditor.tsx`
   - `TestimonialsSectionEditor.tsx`
   - `TimelineSectionEditor.tsx`
   - `FooterSectionEditor.tsx`
   
   Każdy zapisuje `bg_pattern`, `bg_pattern_opacity`, `bg_pattern_color` w config.

4. **Sekcje renderujące** (8 plików) — dodanie warstwy overlay:
   - `HeroSection.tsx`, `TextImageSection.tsx`, `StepsSection.tsx`, `CtaBannerSection.tsx`, `FaqSection.tsx`, `TestimonialsSection.tsx`, `TimelineSection.tsx`, `FooterSection.tsx`
   
   Wzorzec:
   ```tsx
   // Sekcja musi mieć relative + overflow-hidden
   {config.bg_pattern && config.bg_pattern !== 'none' && (
     <div 
       className="absolute inset-0 pointer-events-none z-0" 
       style={getPatternStyle(config.bg_pattern, config.bg_pattern_opacity, config.bg_pattern_color)} 
     />
   )}
   // Treść sekcji musi mieć relative z-10
   ```

### Szczegóły techniczne — przykłady wzorów

```typescript
// Geometryczny: kropki
{ value: 'dots', label: 'Kropki', category: 'geometric',
  getCss: (op, col) => ({
    backgroundImage: `radial-gradient(circle, ${col} 1px, transparent 1px)`,
    backgroundSize: '20px 20px', opacity: op
  })
}

// Materiałowy: len (linen)
{ value: 'linen', label: 'Len', category: 'material',
  getCss: (op) => ({
    backgroundImage: `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='4' height='4'><filter id='n'><feTurbulence baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/></filter><rect width='4' height='4' filter='url(%23n)' opacity='${op}'/></svg>")`,
    backgroundSize: '200px 200px'
  })
}

// Materiałowy: papier
{ value: 'paper', label: 'Papier', category: 'material',
  getCss: (op) => ({
    backgroundImage: `url("data:image/svg+xml,...")`, // feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="5"
    backgroundSize: '300px 300px', opacity: op
  })
}
```

Kolor wzoru domyślnie `#000000` z automatycznym przełączeniem na `#ffffff` gdy tło sekcji jest ciemne (prostą heurystyką luminancji).

