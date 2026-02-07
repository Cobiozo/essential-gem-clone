
# Plan: Premium Redesign Dashboard - Glassmorphism, Gradienty i Nowoczesna Typografia

## Wizja projektu

Przekształcenie dashboardu Pure Life Center w elegancki, premium interfejs inspirowany estetyką Apple i produktów luksusowych z:
- Ciemne tło w głębokim granacie/antracycie
- Metaliczne złoto dla elementów premium
- Świeży błękit dla akcji (CTA)
- Efekty glassmorphism i delikatne gradienty
- Większe zaokrąglenia i efekty blur
- Donut chart z animacją w sekcji Szkolenia
- Czcionka Poppins dla charakteru marki

---

## 1. Paleta kolorystyczna (rozszerzenie systemu)

### Nowe kolory CSS Variables (`index.css`)

```css
:root {
  /* Premium colors */
  --gold-metallic: 43 74% 49%;      /* #D4AF37 */
  --gold-light: 43 85% 67%;          /* #F5E050 */
  --gold-dark: 43 70% 38%;           /* #B8860B */
  
  --action-blue: 210 100% 52%;       /* Fresh blue for CTAs */
  --action-teal: 168 76% 42%;        /* Teal alternative */
  
  --deep-navy: 225 50% 8%;           /* Deep navy background */
  --charcoal: 220 20% 12%;           /* Elegant charcoal */
}

.dark {
  --background: 225 50% 6%;          /* Głęboki granat zamiast szarego */
  --card: 225 35% 10%;               /* Elegancki antracyt */
  --muted: 225 25% 15%;              /* Ciemniejszy muted */
}
```

---

## 2. Komponent Card - Glassmorphism z gradientami

### Modyfikacja `src/components/ui/card.tsx`

```text
OBECNE:
- rounded-lg border bg-card shadow-sm

NOWE KLASY BAZOWE:
- rounded-2xl (większy border-radius)
- bg-gradient-to-br from-card/80 to-card/40 
- backdrop-blur-sm
- border border-white/5
- shadow-xl shadow-black/10
```

### Nowa wariant `premium` dla kart widżetów:

```typescript
// Dodanie wariantów do Card
const cardVariants = cva(
  "rounded-2xl border transition-all duration-300",
  {
    variants: {
      variant: {
        default: "bg-card border-border shadow-sm",
        premium: "bg-gradient-to-br from-[hsl(225,35%,12%)] to-[hsl(225,40%,8%)] border-white/5 shadow-xl shadow-black/20 backdrop-blur-sm",
        glass: "bg-white/5 backdrop-blur-xl border-white/10",
      }
    },
    defaultVariants: { variant: "default" }
  }
)
```

---

## 3. Nagłówki widżetów - Efekt Blur

### Modyfikacja `CardHeader` w widżetach

```tsx
// Nowy styl nagłówka z blur pod spodem
<CardHeader className="pb-2 relative">
  {/* Blur backdrop za nagłówkiem */}
  <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent rounded-t-2xl backdrop-blur-[2px]" />
  
  <CardTitle className="relative z-10 text-base font-semibold flex items-center gap-2">
    <GraduationCap className="h-5 w-5 text-gold" /> {/* Większe ikony */}
    {t('dashboard.trainingProgress')}
  </CardTitle>
</CardHeader>
```

---

## 4. Ikony - Większe i bardziej wyraziste

### Zmiana rozmiaru ikon w nagłówkach

```text
OBECNE: h-4 w-4
NOWE: h-5 w-5 lub h-6 w-6 dla kluczowych widżetów

Dodatkowe efekty:
- drop-shadow dla ikon primary
- gradient fill dla premium ikon
```

### Przykład gradientowej ikony:

```tsx
<div className="p-2 rounded-xl bg-gradient-to-br from-gold-metallic to-gold-dark">
  <GraduationCap className="h-5 w-5 text-white" />
</div>
```

---

## 5. Sekcja Szkolenia - Donut Chart z animacją

### Nowy komponent `TrainingDonutChart`

Zamiast liniowego `<Progress>`, okrągły wykres (donut):

```tsx
// src/components/dashboard/widgets/TrainingDonutChart.tsx
interface DonutChartProps {
  progress: number;
  size?: number;
}

const TrainingDonutChart: React.FC<DonutChartProps> = ({ progress, size = 48 }) => {
  const circumference = 2 * Math.PI * 18; // radius = 18
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Tło koła */}
        <circle
          cx={size/2} cy={size/2} r="18"
          className="stroke-muted"
          strokeWidth="4"
          fill="transparent"
        />
        {/* Postęp z gradientem */}
        <circle
          cx={size/2} cy={size/2} r="18"
          className="stroke-[url(#goldGradient)]"
          strokeWidth="4"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 0.8s ease-out'
          }}
        />
        <defs>
          <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D4AF37" />
            <stop offset="100%" stopColor="#F5E050" />
          </linearGradient>
        </defs>
      </svg>
      {/* Procent w środku */}
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-foreground">
        {progress}%
      </span>
    </div>
  );
};
```

### Modyfikacja `TrainingProgressWidget.tsx`

```tsx
{modules.map((module) => (
  <div
    key={module.id}
    className="group cursor-pointer hover:bg-white/5 -mx-2 px-3 py-3 rounded-xl transition-all"
    onClick={() => navigate(`/training/${module.id}`)}
  >
    <div className="flex items-center gap-4">
      {/* Donut chart zamiast progress bar */}
      <TrainingDonutChart progress={module.progress} />
      
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-foreground line-clamp-1">
          {module.title}
        </span>
        <span className={`text-xs ${module.isCompleted ? 'text-emerald-400' : 'text-muted-foreground'}`}>
          {module.isCompleted ? '✓ Ukończono' : `${module.progress}% ukończono`}
        </span>
      </div>
    </div>
  </div>
))}
```

---

## 6. Przyciski akcji - Świeży błękit/zieleń

### Nowe warianty przycisków (`button.tsx`)

```typescript
const buttonVariants = cva(
  "... rounded-xl ...", // Większy border-radius
  {
    variants: {
      variant: {
        // ... existing
        action: "bg-gradient-to-r from-[hsl(210,100%,52%)] to-[hsl(200,100%,45%)] text-white hover:opacity-90 shadow-lg shadow-blue-500/20",
        gold: "bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-black hover:opacity-90 shadow-lg shadow-amber-500/20",
      }
    }
  }
)
```

### Zastosowanie w widżetach

```tsx
// Przycisk "Kontynuuj szkolenie"
<Button variant="action" className="w-full mt-3">
  <Play className="h-4 w-4 mr-2" />
  {t('dashboard.continueTraining')}
</Button>

// Przycisk "Zadzwoń" - wariant gold/action
<Button variant="action" size="sm">
  <Phone className="h-3 w-3 mr-1" />
  Zadzwoń
</Button>
```

---

## 7. Typografia - Poppins jako główna czcionka

### Modyfikacja `index.css`

```css
body {
  font-family: 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif;
}

/* Headings - bolder weight */
h1, h2, h3, h4, h5, h6,
.font-semibold, .font-bold {
  font-family: 'Poppins', sans-serif;
  font-weight: 600;
}
```

### Modyfikacja `tailwind.config.ts`

```typescript
theme: {
  extend: {
    fontFamily: {
      sans: ['Poppins', 'Inter', 'sans-serif'],
      display: ['Poppins', 'sans-serif'],
    }
  }
}
```

---

## 8. Tło dashboardu - Głęboki granat

### Modyfikacja `DashboardLayout.tsx`

```tsx
<div className="min-h-screen flex w-full bg-gradient-to-br from-[hsl(225,50%,6%)] via-[hsl(225,40%,8%)] to-[hsl(230,35%,5%)]">
```

### Alternatywnie w CSS

```css
.dark .dashboard-bg {
  background: linear-gradient(135deg, 
    hsl(225, 50%, 6%) 0%, 
    hsl(225, 40%, 8%) 50%, 
    hsl(230, 35%, 5%) 100%
  );
}
```

---

## 9. Widget WelcomeWidget - Premium redesign

```tsx
<Card className="col-span-full overflow-hidden relative">
  {/* Gradient overlay */}
  <div className="absolute inset-0 bg-gradient-to-br from-gold-metallic/10 via-transparent to-blue-500/5" />
  
  {/* Glass effect bar pod greeting */}
  <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-white/5 to-transparent backdrop-blur-[1px]" />
  
  <CardContent className="relative z-10 p-6">
    <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-foreground via-gold-metallic to-foreground bg-clip-text text-transparent">
      {getGreeting()}{firstName ? `, ${firstName}` : ''}! 👋
    </h2>
    {/* Clock with gold accent */}
    <div className="text-3xl font-mono font-bold text-gold-metallic">
      {formattedTime}
    </div>
  </CardContent>
</Card>
```

---

## 10. Animacje i mikro-interakcje

### Nowe keyframes w `tailwind.config.ts`

```typescript
keyframes: {
  // Donut chart fill animation
  "donut-fill": {
    "0%": { strokeDashoffset: "var(--circumference)" },
    "100%": { strokeDashoffset: "var(--target-offset)" }
  },
  // Card hover glow
  "card-glow": {
    "0%, 100%": { boxShadow: "0 0 0 rgba(212, 175, 55, 0)" },
    "50%": { boxShadow: "0 0 30px rgba(212, 175, 55, 0.1)" }
  },
  // Subtle float
  "float": {
    "0%, 100%": { transform: "translateY(0)" },
    "50%": { transform: "translateY(-4px)" }
  }
}
```

---

## Podsumowanie plików do modyfikacji

| Plik | Zakres zmian |
|------|--------------|
| `src/index.css` | Nowe zmienne kolorów, font-family Poppins, tło gradientowe |
| `tailwind.config.ts` | FontFamily, nowe animacje, extended colors |
| `src/components/ui/card.tsx` | Warianty premium/glass, większy border-radius |
| `src/components/ui/button.tsx` | Nowe warianty action/gold, rounded-xl |
| `src/components/dashboard/DashboardLayout.tsx` | Gradient background zamiast muted/30 |
| `src/components/dashboard/widgets/TrainingProgressWidget.tsx` | Donut chart zamiast progress bar |
| `src/components/dashboard/widgets/WelcomeWidget.tsx` | Premium styling z gradientami |
| `src/components/dashboard/widgets/TrainingDonutChart.tsx` | NOWY - komponent kołowego wykresu |
| Wszystkie widgety | Zaktualizowane klasy Card, większe ikony, blur headers |

---

## Przykład finalnego wyglądu widżetu

```text
┌──────────────────────────────────────────────────┐
│ ░░░░░░░░░░ BLUR GRADIENT HEADER ░░░░░░░░░░░░░░░░ │
│ ┌──────┐                                         │
│ │ 🎓   │  SZKOLENIA                    Zobacz › │
│ └──────┘                                         │
├──────────────────────────────────────────────────┤
│                                                  │
│  ┌────┐                                          │
│  │⬤78%│  Podstawy marketingu                    │
│  └────┘  78% ukończono                          │
│                                                  │
│  ┌────┐                                          │
│  │⬤45%│  Produkty Eqology                       │
│  └────┘  45% ukończono                          │
│                                                  │
│  ┌────┐                                          │
│  │ ✓  │  Certyfikat specjalisty                 │
│  └────┘  ✓ Ukończono                            │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │  ▶  KONTYNUUJ SZKOLENIE              │  │
│  └────────────────────────────────────────────┘  │
│           (gradient niebieski)                   │
└──────────────────────────────────────────────────┘
     ▲ Tło: gradient ciemny granat → czerń
     ▲ Ramka: subtelna biała 5% opacity
     ▲ Border-radius: 2xl (16px)
```

---

## Efekty wizualne

1. **Karty** - delikatny gradient od grafitu do czerni, efekt szkła
2. **Nagłówki** - blur pod spodem dla głębi
3. **Zaokrąglenia** - rounded-2xl (16px) zamiast lg (8px)
4. **Złoto metaliczne** - dla rang, wyników, ikon premium
5. **Błękit akcji** - dla przycisków CTA (Start, Kontynuuj)
6. **Tło** - głęboki granat wpadający w czerń
7. **Typografia** - Poppins dla nowoczesnego charakteru
8. **Donut chart** - animowany wykres postępu w szkoleniach
