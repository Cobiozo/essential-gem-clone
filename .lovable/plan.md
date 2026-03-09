

# Fix: Klikalność ikon i przycisków na urządzeniach mobilnych (iPad/iPhone)

## Problem

Przyciski akcji w widżetach dashboardu (CalendarWidget, MyMeetingsWidget, CombinedOtpCodesWidget) mają **24px wysokości** (`h-6`) i **minimalne paddingi** (`px-2`), co jest znacznie poniżej wymaganego przez Apple minimum **44px** dla elementów dotykalnych. Na urządzeniach iOS przyciski są niemal niemożliwe do trafienia palcem.

Dotyczy to:
- Przycisk "Zaproś Gościa" (CalendarWidget) — `h-6 px-2`, ikona `h-3 w-3`
- Przyciski "Szczegóły", "Zapisz się", "Wypisz się" (CalendarWidget) — `h-6 px-2`
- Przyciski "WEJDŹ", "Szczegóły", "Anuluj" (MyMeetingsWidget) — `h-6 px-2/px-3`
- Przyciski kopiowania OTP (CombinedOtpCodesWidget) — `h-6 w-6`, gap `0.5`

## Rozwiązanie

Zwiększyć touch targets do minimum 44px na mobile zachowując kompaktowy wygląd na desktop. Podejście: **zwiększenie min-height/min-width przycisków na mobile** + **zwiększenie gap między przyciskami**.

### Zmiany w plikach:

**1. `src/index.css`** — dodanie globalnej reguły mobilnej dla małych przycisków w widżetach:
```css
@media (pointer: coarse) {
  /* Mobile touch targets - minimum 44px */
  .touch-target-sm {
    min-height: 44px;
    min-width: 44px;
  }
}
```

**2. `src/components/dashboard/widgets/CalendarWidget.tsx`**:
- Wszystkie przyciski w sekcji eventów: dodać klasę `touch-target-sm` 
- Zwiększyć `gap-1` → `gap-2` w kontenerze przycisków na mobile
- Przycisk "Zaproś Gościa": zwiększyć z `h-6 px-2` na `h-8 px-3 min-h-[44px]` (via responsive)

**3. `src/components/dashboard/widgets/MyMeetingsWidget.tsx`**:
- Wszystkie przyciski akcji: dodać `touch-target-sm`
- Przyciski "WEJDŹ": `h-6 px-3` → `h-8 px-3` + `touch-target-sm`

**4. `src/components/dashboard/widgets/CombinedOtpCodesWidget.tsx`**:
- Ikony kopiowania: `h-6 w-6` → `h-8 w-8` + `touch-target-sm`
- Gap między ikonami: `gap-0.5` → `gap-1`

**5. `src/components/dashboard/widgets/CalendarWidget.tsx` (getRegistrationButton)**:
- Wszystkie przyciski wewnątrz `getRegistrationButton()`: dodać `touch-target-sm`

### Podejście techniczne:
- Klasa `touch-target-sm` w CSS z `@media (pointer: coarse)` — działa tylko na urządzeniach dotykowych
- Na desktopie przyciski zachowują obecny kompaktowy rozmiar
- Na iOS/iPad/Android przyciski będą miały min 44x44px hit area

### Pliki do edycji:
- `src/index.css`
- `src/components/dashboard/widgets/CalendarWidget.tsx`
- `src/components/dashboard/widgets/MyMeetingsWidget.tsx`
- `src/components/dashboard/widgets/CombinedOtpCodesWidget.tsx`

