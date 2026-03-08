

# Plan: Dodanie przycisków "Kopiuj wiadomość" i "Kopiuj link" do widżetu OTP

## Problem
Widget `CombinedOtpCodesWidget` ma tylko przycisk kopiowania kodu. Brakuje przycisków do kopiowania linku i pełnej wiadomości (link + kod).

## Rozwiązanie

### `src/components/dashboard/widgets/CombinedOtpCodesWidget.tsx`

1. Dodać import `Link2, MessageSquare` z lucide-react i `copyToClipboard` z `@/lib/clipboardUtils`
2. Dodać funkcje:
   - `handleCopyLink` — kopiuje URL:
     - InfoLink: `${origin}/infolink/${reflink.slug || reflink.id}`
     - HK: `https://purelife.info.pl/zdrowa-wiedza/${knowledge.slug}`
   - `handleCopyMessage` — kopiuje sformatowaną wiadomość z linkiem + kodem (wzór z `MyHkCodesHistory`)
3. Obok istniejącego przycisku Copy (kod) dodać 2 nowe przyciski z tooltipami:
   - 📋 Kopiuj kod (istniejący)
   - 🔗 Kopiuj link
   - 💬 Kopiuj wiadomość

Użyć `copyToClipboard` zamiast `navigator.clipboard.writeText` (iOS compatibility).

### Interfejs — rząd 3 małych przycisków obok kodu:
```text
ZW-U4MW-BF [📋] [🔗] [💬]    Oczekuje
Insulinooporność               ⏱ 0/3
```

### Plik do edycji:
1. `src/components/dashboard/widgets/CombinedOtpCodesWidget.tsx`

