

## Pełna edytowalność przycisku CTA w sekcji CTA Banner

### Problem
Przycisk CTA w sekcji bannerowej ma zakodowane na stałe: kolor (orange-500), zaokrąglenie (rounded-xl), czcionkę (font-bold, text-base), rozmiar (px-8 py-4), cień i ikonę. Brak jakichkolwiek pól edycji w `CtaBannerEditor` poza tekstem i URL.

### Rozwiązanie
Dodać nowe pola konfiguracyjne do edytora i renderera:

**Nowe pola w config:**
- `cta_bg_color` — kolor tła przycisku (domyślnie `#f97316` / orange-500)
- `cta_text_color` — kolor tekstu przycisku (domyślnie `#ffffff`)
- `cta_border_color` — kolor obramowania (opcjonalnie, puste = brak)
- `cta_border_width` — grubość obramowania (0-4px)
- `cta_radius` — zaokrąglenie rogów (select: none/sm/md/lg/xl/full)
- `cta_font_size` — rozmiar czcionki (select: sm/base/lg/xl/2xl)
- `cta_font_weight` — grubość czcionki (select: normal/medium/semibold/bold)
- `cta_padding` — rozmiar przycisku (select: small/medium/large)
- `cta_shadow` — cień (select: none/sm/md/lg)
- `cta_icon` — ikona emoji przed tekstem (input, domyślnie `📝`, puste = brak)
- `cta_full_width` — pełna szerokość (checkbox)

**Plik 1: `src/components/admin/template-sections/CtaBannerEditor.tsx`**
- Dodać fieldset "Styl przycisku CTA" z kontrolkami:
  - 2× ColorInput (kolor tła, kolor tekstu)
  - ColorInput + slider (obramowanie: kolor + grubość)
  - 4× Select (zaokrąglenie, rozmiar czcionki, grubość czcionki, padding, cień)
  - Input (ikona emoji)
  - Checkbox (pełna szerokość)
  - EditableFieldToggle na każdym polu

**Plik 2: `src/components/partner-page/sections/CtaBannerSection.tsx`**
- Zamienić hardcoded klasy CSS na dynamiczne `style` na podstawie nowych pól config
- Mapowanie wartości:
  - radius: `none→0, sm→0.25rem, md→0.5rem, lg→0.75rem, xl→1rem, full→9999px`
  - fontSize: `sm→0.875rem, base→1rem, lg→1.125rem, xl→1.25rem, 2xl→1.5rem`
  - padding: `small→px-4 py-2, medium→px-8 py-4, large→px-10 py-5`
  - shadow: `none→none, sm→0 1px 2px, md→0 4px 6px -1px, lg→0 10px 15px -3px`

### Szczegóły techniczne

Edytor (fragment):
```tsx
<fieldset className="border rounded-lg p-4 space-y-3">
  <legend className="text-sm font-semibold px-2">Styl przycisku CTA</legend>
  <div className="grid grid-cols-2 gap-3">
    <ColorInput label="Kolor tła" value={config.cta_bg_color || '#f97316'} onChange={v => update('cta_bg_color', v)} />
    <ColorInput label="Kolor tekstu" value={config.cta_text_color || '#ffffff'} onChange={v => update('cta_text_color', v)} />
  </div>
  <Select value={config.cta_radius || 'xl'} onValueChange={v => update('cta_radius', v)}>...</Select>
  <Select value={config.cta_font_size || 'base'} ...>...</Select>
  <!-- itd. -->
</fieldset>
```

Renderer (fragment):
```tsx
<a href={...} style={{
  backgroundColor: config.cta_bg_color || '#f97316',
  color: config.cta_text_color || '#ffffff',
  borderRadius: radiusMap[config.cta_radius || 'xl'],
  fontSize: fontSizeMap[config.cta_font_size || 'base'],
  fontWeight: config.cta_font_weight || 'bold',
  padding: paddingMap[config.cta_padding || 'medium'],
  boxShadow: shadowMap[config.cta_shadow || 'lg'],
  border: config.cta_border_width ? `${config.cta_border_width}px solid ${config.cta_border_color || '#000'}` : 'none',
  width: config.cta_full_width ? '100%' : undefined,
}}>
  {config.cta_icon !== '' && (config.cta_icon || '📝')} {cta_text}
</a>
```

Zmiana dotyczy 2 plików. Wszystkie nowe pola mają sensowne wartości domyślne = istniejące szablony wyglądają identycznie bez żadnych zmian w danych.

