

# Plan: Naprawa trybu jasnego i stylizacja strony logowania

## Zidentyfikowane problemy

### 1. Widżety premium w trybie jasnym

Na podstawie screenshota widoczne są problemy:
- **Karta "Postęp szkoleń"** - ciemne tło (gradient od `hsl(225,35%,12%)` do `hsl(225,40%,8%)`) wygląda źle w jasnym trybie
- **Panel powitalny** - efekt glassmorphism (`from-white/5`) i overlay'e nie działają prawidłowo w jasnym trybie
- Elementy są zbyt kontrastowe i niespójne z resztą interfejsu

### 2. Strona logowania

Wymagane zmiany:
- Gradientowe tło w odcieniach granatu i szafiru (tylko w trybie ciemnym)
- Przyciski "Zaloguj się" i "Zarejestruj się" w kolorze złotym

---

## Rozwiązanie

### Faza 1: Aktualizacja wariantu "premium" w Card

**Plik:** `src/components/ui/card.tsx`

Zmiana wariantu `premium` aby był responsywny na tryb:

```typescript
const cardVariants = cva(
  "rounded-2xl border text-card-foreground transition-all duration-300",
  {
    variants: {
      variant: {
        default: "bg-card border-border shadow-sm",
        // NOWE: różne style dla light i dark mode
        premium: [
          // Light mode: jasny gradient z delikatnym cieniem
          "bg-gradient-to-br from-white to-slate-50 border-slate-200/50 shadow-lg shadow-slate-200/50",
          // Dark mode: ciemny gradient premium
          "dark:from-[hsl(225,35%,12%)] dark:to-[hsl(225,40%,8%)] dark:border-white/5 dark:shadow-xl dark:shadow-black/20 dark:backdrop-blur-sm"
        ].join(" "),
        glass: "bg-white/5 backdrop-blur-xl border-white/10 shadow-lg",
      },
    },
    defaultVariants: { variant: "default" },
  }
);
```

---

### Faza 2: Poprawka WelcomeWidget dla trybu jasnego

**Plik:** `src/components/dashboard/widgets/WelcomeWidget.tsx`

Zmiany:
1. Overlay gradient - różne kolory dla light/dark
2. Glass effect bar - widoczny tylko w dark mode
3. Tekst powitania - spójny gradient w obu trybach

```tsx
{/* Gradient overlay - różny dla light/dark */}
<div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-blue-500/5 dark:from-gold/10 dark:via-transparent dark:to-action-blue/5 pointer-events-none" />

{/* Glass effect bar - tylko dark mode */}
<div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-black/[0.02] to-transparent dark:from-white/5 dark:to-transparent dark:backdrop-blur-[1px] pointer-events-none" />

{/* Powitanie - gradient widoczny w obu trybach */}
<h2 className="text-2xl md:text-3xl font-bold 
  bg-gradient-to-r from-slate-800 via-amber-600 to-slate-800 
  dark:from-foreground dark:via-gold dark:to-foreground 
  bg-clip-text text-transparent bg-[length:200%_auto] animate-[shimmer_3s_ease-in-out_infinite]">

{/* Zegar - kolor złoty w obu trybach */}
<div className="flex items-center gap-2 text-2xl md:text-3xl font-mono font-bold text-amber-600 dark:text-gold tabular-nums">
  <Clock className="h-5 w-5 md:h-6 md:w-6 text-amber-600/70 dark:text-gold/70" />

{/* Select timezone - style dla light mode */}
<SelectTrigger className="w-[160px] h-8 text-xs bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 backdrop-blur-sm">
```

---

### Faza 3: Poprawka TrainingProgressWidget dla trybu jasnego

**Plik:** `src/components/dashboard/widgets/TrainingProgressWidget.tsx`

Zmiany w nagłówku i efektach:

```tsx
{/* Blur backdrop - różny dla light/dark */}
<div className="absolute inset-0 bg-gradient-to-b from-black/[0.02] to-transparent dark:from-white/5 dark:to-transparent rounded-t-2xl dark:backdrop-blur-[2px]" />

{/* Hover state na module - widoczny w obu trybach */}
<div className="group cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 -mx-2 px-3 py-3 rounded-xl transition-all">
```

---

### Faza 4: Strona logowania - gradient i złote przyciski

**Plik:** `src/pages/Auth.tsx`

#### 4.1 Gradient tła (tylko dark mode)

```tsx
<div className="min-h-screen bg-background dark:bg-gradient-to-br dark:from-[hsl(225,50%,8%)] dark:via-[hsl(230,45%,12%)] dark:to-[hsl(240,40%,6%)] flex items-center justify-center p-4 sm:p-6 lg:p-8">
```

#### 4.2 Złote przyciski "Zaloguj się" i "Zarejestruj się"

W CardFooter dla obu formularzy:

```tsx
{/* Przycisk logowania */}
<Button 
  type="submit" 
  className="w-full bg-gradient-to-r from-[#D4AF37] via-[#F5E050] to-[#B8860B] text-black font-semibold hover:opacity-90 shadow-lg shadow-amber-500/20" 
  disabled={loading}
>
  {loading ? t('auth.loggingIn') : t('auth.signIn')}
</Button>

{/* Przycisk rejestracji */}
<Button 
  type="submit" 
  className="w-full bg-gradient-to-r from-[#D4AF37] via-[#F5E050] to-[#B8860B] text-black font-semibold hover:opacity-90 shadow-lg shadow-amber-500/20" 
  disabled={loading}
>
  {loading ? t('auth.registering') : t('auth.signUp')}
</Button>
```

---

## Podsumowanie zmian

| Plik | Zmiana |
|------|--------|
| `src/components/ui/card.tsx` | Wariant `premium` responsywny na light/dark mode |
| `src/components/dashboard/widgets/WelcomeWidget.tsx` | Overlay i tekst spójne w obu trybach |
| `src/components/dashboard/widgets/TrainingProgressWidget.tsx` | Backdrop blur i hover responsywne |
| `src/pages/Auth.tsx` | Gradient tło dark mode + złote przyciski |

---

## Efekt końcowy

### Light mode:
- Karty premium: jasny gradient od białego do `slate-50` z delikatnym cieniem
- Powitanie: złoty gradient na ciemnym tekście (`slate-800` → `amber-600`)
- Hover effects: `bg-black/5` zamiast `bg-white/5`

### Dark mode:
- Bez zmian - zachowany obecny premium wygląd
- Gradientowe ciemne tło na stronie logowania (granat → szafir)

### Strona logowania:
- Tło: gradient granat/szafir tylko w dark mode
- Przyciski: metaliczny złoty gradient (`#D4AF37` → `#F5E050` → `#B8860B`)

