

## Dodanie koloru tła kafelka partnera w nagłówku

### Problem
Kafelek partnera w nagłówku ma hardcoded `bg-white/90` zarówno w `HeaderSection.tsx`, jak i w `HeroSection.tsx`. Brak pola w edytorze do zmiany tego koloru.

### Zmiany

**1. `src/components/admin/template-sections/HeaderSectionEditor.tsx`**
- W sekcji "Kafelek partnera w nagłówku" (linie 246-260), dodać pola:
  - `ColorInput` dla `partner_badge.bg_color` (kolor tła kafelka)
  - `ColorInput` dla `partner_badge.text_color` (kolor tekstu kafelka)

**2. `src/components/partner-page/sections/HeaderSection.tsx`**
- Linia 198: zamienić hardcoded `bg-white/90` na dynamiczny styl `backgroundColor` z `config.partner_badge.bg_color` (fallback `rgba(255,255,255,0.9)`)
- Dodać `color` ze `config.partner_badge.text_color` do tekstu wewnątrz kafelka

**3. `src/components/partner-page/sections/HeroSection.tsx`**
- Linia 152 i 292: analogiczna zmiana — zamienić `bg-white/90` na dynamiczny `backgroundColor` z `config.partner_badge.bg_color`
- Ustawić kolor tekstu z `config.partner_badge.text_color` zamiast hardcoded `text-gray-500`/`text-gray-900`

