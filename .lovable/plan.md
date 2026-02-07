

# Plan: Redesign Pure Science Search AI - Glassmorphism & Metallic Gold

## Wizja projektu

Przekształcenie modułu Medical Chat Widget w elegancki, prestiżowy interfejs o nazwie **Pure Science Search AI** z estetyką glassmorphism na ciemnym tle antracytowym z akcentami metalicznego złota.

---

## 1. Paleta kolorystyczna

### Kolory główne (do dodania w tailwind.config.ts)

```text
science-anthracite:
  - 50:  #F5F5F5 (jasny akcent)
  - 100: #E0E0E0
  - 800: #1A1A1A (głęboki grafit)
  - 900: #121212 (antracyt bazowy)
  - 950: #0A0A0A (czerń)

science-gold:
  - 50:  #FDF8E8 (jasny połysk)
  - 100: #F5E6C4
  - 400: #D4AF37 (złoty blask)
  - 500: #C5A059 (metaliczne złoto)
  - 600: #B8860B (ciemne złoto)
  - 700: #8B6914 (antyczne złoto)
```

### Gradient złoty (metaliczny efekt)
```css
background: linear-gradient(135deg, #D4AF37 0%, #F5E050 25%, #C5A059 50%, #B8860B 100%);
```

---

## 2. Struktura komponentu - Glassmorphism

### Panel główny

```text
┌────────────────────────────────────────────────────────────┐
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ HEADER ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🔬 PURE SCIENCE SEARCH AI        📜 ⬇️ 🗑️         │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Wyniki: [10 ▼]                         (Settings)   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ ⚠️ Informacje służą celom edukacyjnym...           │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  ╔══════════════════════════════════════════════════════╗  │
│  ║                                                      ║  │
│  ║                    MESSAGES AREA                     ║  │
│  ║                                                      ║  │
│  ║  ┌─────────────────────────────────────┐            ║  │
│  ║  │ User message          │ złota ramka │ ──────────►║  │
│  ║  └─────────────────────────────────────┘            ║  │
│  ║                                                      ║  │
│  ║  ┌───────────────────────────────────────────────┐  ║  │
│  ║  │ AI Response                                   │  ║  │
│  ║  │ glassmorphism bg + złote linki do źródeł     │  ║  │
│  ║  └───────────────────────────────────────────────┘  ║  │
│  ║                                                      ║  │
│  ╚══════════════════════════════════════════════════════╝  │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ [    Wpisz pytanie medyczne...            ] [🚀]    │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

---

## 3. Szczegółowe style CSS

### 3.1 Przycisk toggle (FAB)

```css
/* Obecny (linia 989): */
bg-gradient-to-br from-blue-600 to-indigo-700

/* Nowy glassmorphism + gold: */
background: linear-gradient(135deg, rgba(212, 175, 55, 0.9), rgba(197, 160, 89, 0.8));
backdrop-filter: blur(8px);
border: 1px solid rgba(245, 224, 80, 0.3);
box-shadow: 
  0 4px 24px rgba(0, 0, 0, 0.5),
  0 0 20px rgba(212, 175, 55, 0.2),
  inset 0 1px 0 rgba(255, 255, 255, 0.2);
```

### 3.2 Panel główny

```css
/* Obecny (linia 1006): */
bg-background border border-border rounded-lg

/* Nowy glassmorphism: */
background: rgba(18, 18, 18, 0.85);
backdrop-filter: blur(20px) saturate(180%);
border: 1px solid rgba(197, 160, 89, 0.15);
border-radius: 1.25rem;
box-shadow: 
  0 8px 32px rgba(0, 0, 0, 0.7),
  0 0 1px rgba(197, 160, 89, 0.5),
  inset 0 0 40px rgba(26, 26, 26, 0.3);
```

### 3.3 Header

```css
/* Obecny (linia 1013): */
bg-gradient-to-r from-blue-600 to-indigo-700

/* Nowy antracyt + złoty akcent: */
background: linear-gradient(to right, #1A1A1A, #0A0A0A);
border-bottom: 1px solid rgba(197, 160, 89, 0.3);

/* Tekst nagłówka z złotym gradientem: */
background: linear-gradient(135deg, #D4AF37, #F5E050, #C5A059);
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
font-weight: 700;
letter-spacing: 0.05em;
```

### 3.4 Wiadomość użytkownika

```css
/* Obecny (linia 1171): */
bg-blue-600 text-white

/* Nowy - ciemny z złotym akcentem: */
background: linear-gradient(135deg, rgba(26, 26, 26, 0.95), rgba(18, 18, 18, 0.9));
border-right: 3px solid #C5A059;
color: #F5F5F5;
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
```

### 3.5 Wiadomość asystenta (AI)

```css
/* Obecny: */
bg-muted text-foreground

/* Nowy glassmorphism: */
background: rgba(26, 26, 26, 0.6);
backdrop-filter: blur(12px);
border: 1px solid rgba(197, 160, 89, 0.1);
color: #E0E0E0;

/* Linki do źródeł PubMed w kolorze złotym: */
a {
  color: #D4AF37;
  text-decoration: underline;
  text-underline-offset: 2px;
}
a:hover {
  color: #F5E050;
}
```

### 3.6 Pole wpisywania (Input)

```css
/* Nowy styl: */
background: rgba(26, 26, 26, 0.7);
border: 1px solid rgba(197, 160, 89, 0.2);
color: #F5F5F5;
placeholder-color: rgba(197, 160, 89, 0.5);

&:focus {
  border-color: rgba(197, 160, 89, 0.5);
  box-shadow: 0 0 0 2px rgba(197, 160, 89, 0.1);
}
```

### 3.7 Przycisk wysyłania

```css
/* Obecny (linia 1223): */
bg-blue-600 hover:bg-blue-700

/* Nowy złoty gradient: */
background: linear-gradient(135deg, #C5A059, #D4AF37);
color: #0A0A0A;
border: none;
box-shadow: 0 2px 8px rgba(197, 160, 89, 0.3);

&:hover {
  background: linear-gradient(135deg, #D4AF37, #F5E050);
  box-shadow: 0 4px 12px rgba(212, 175, 55, 0.4);
}

&:disabled {
  background: rgba(197, 160, 89, 0.3);
  color: rgba(10, 10, 10, 0.5);
}
```

### 3.8 Disclaimer bar

```css
/* Obecny (linia 1156): */
bg-amber-50 dark:bg-amber-950/30 text-amber-800

/* Nowy - subtelny złoty z antracytem: */
background: rgba(197, 160, 89, 0.08);
border-bottom: 1px solid rgba(197, 160, 89, 0.15);
color: rgba(212, 175, 55, 0.9);
```

### 3.9 Settings bar

```css
/* Obecny (linia 1132): */
bg-muted/50

/* Nowy: */
background: rgba(18, 18, 18, 0.6);
border-bottom: 1px solid rgba(197, 160, 89, 0.1);
color: rgba(197, 160, 89, 0.7);
```

### 3.10 Loading indicator

```css
/* Obecny - niebieskie kropki (linia 1190): */
bg-blue-500

/* Nowy - złote pulsujące kropki: */
background: #C5A059;
animation: pulse-gold 1s infinite;

@keyframes pulse-gold {
  0%, 100% { opacity: 0.4; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
}
```

---

## 4. Dropdowny i Popovery (glassmorphism)

```css
/* Wszystkie menu rozwijane: */
background: rgba(18, 18, 18, 0.95);
backdrop-filter: blur(16px);
border: 1px solid rgba(197, 160, 89, 0.2);
box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);

/* Hover na elementach menu: */
&:hover {
  background: rgba(197, 160, 89, 0.1);
}

/* Aktywny element: */
&[data-highlighted] {
  background: rgba(197, 160, 89, 0.15);
  color: #D4AF37;
}
```

---

## 5. Animacje i mikro-interakcje

### 5.1 Nowe keyframes (do tailwind.config.ts)

```typescript
keyframes: {
  // Złoty puls dla ładowania
  "pulse-gold": {
    "0%, 100%": { opacity: "0.4", transform: "scale(0.8)" },
    "50%": { opacity: "1", transform: "scale(1.2)" },
  },
  // Subtelny shimmer dla złotych elementów
  "gold-shimmer": {
    "0%": { backgroundPosition: "-200% 0" },
    "100%": { backgroundPosition: "200% 0" },
  },
  // Glow dla przycisku FAB
  "gold-glow": {
    "0%, 100%": { boxShadow: "0 0 15px rgba(212, 175, 55, 0.3)" },
    "50%": { boxShadow: "0 0 25px rgba(212, 175, 55, 0.5)" },
  },
}
```

### 5.2 Animacja otwierania panelu

```css
/* Wejście z glassmorphism blur */
@keyframes panel-open {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
    backdrop-filter: blur(0px);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
    backdrop-filter: blur(20px);
  }
}
animation: panel-open 0.3s ease-out;
```

---

## 6. Podsumowanie zmian w plikach

| Plik | Zakres zmian |
|------|--------------|
| `tailwind.config.ts` | Dodanie kolorów `science-anthracite`, `science-gold`, nowe keyframes animacji |
| `src/index.css` | Opcjonalnie: globalne style dla glassmorphism utility classes |
| `src/components/MedicalChatWidget.tsx` | Redesign całego UI - panel, header, wiadomości, input, przyciski |

---

## 7. Przykład finalnego kodu (kluczowe fragmenty)

### Toggle Button (linia ~987-1001)

```tsx
<button
  onClick={() => setIsOpen(!isOpen)}
  className="fixed z-50 w-14 h-14 rounded-full 
    bg-gradient-to-br from-[#D4AF37]/90 via-[#C5A059]/85 to-[#B8860B]/80
    hover:from-[#F5E050]/95 hover:via-[#D4AF37]/90 hover:to-[#C5A059]/85
    text-[#0A0A0A] shadow-[0_4px_24px_rgba(0,0,0,0.5),0_0_20px_rgba(212,175,55,0.2)]
    border border-[#F5E050]/30
    flex items-center justify-center transition-all duration-300 
    hover:scale-105 hover:shadow-[0_6px_32px_rgba(0,0,0,0.6),0_0_30px_rgba(212,175,55,0.35)]
    animate-[gold-glow_3s_ease-in-out_infinite]"
  style={{...}}
>
  {isOpen ? <X className="w-6 h-6" /> : <Search className="w-6 h-6" />}
</button>
```

### Panel główny (linia ~1005-1011)

```tsx
<div 
  className="fixed z-50 w-[420px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-12rem)]
    bg-[#121212]/85 backdrop-blur-xl
    border border-[#C5A059]/15
    rounded-2xl
    shadow-[0_8px_32px_rgba(0,0,0,0.7),0_0_1px_rgba(197,160,89,0.5),inset_0_0_40px_rgba(26,26,26,0.3)]
    flex flex-col overflow-hidden
    animate-[panel-open_0.3s_ease-out]"
  style={{...}}
>
```

### Header (linia ~1012-1129)

```tsx
<div className="bg-gradient-to-r from-[#1A1A1A] to-[#0A0A0A] 
  border-b border-[#C5A059]/30 
  px-4 py-3.5 flex items-center justify-between shrink-0">
  <div className="flex items-center gap-2.5">
    <Search className="w-5 h-5 text-[#C5A059]" />
    <span className="font-bold text-sm tracking-wider 
      bg-gradient-to-r from-[#D4AF37] via-[#F5E050] to-[#C5A059] 
      bg-clip-text text-transparent">
      PURE SCIENCE SEARCH AI
    </span>
  </div>
  {/* Przyciski w złotym stylu */}
  <div className="flex items-center gap-1">
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-[#C5A059]/70 hover:text-[#D4AF37] 
        hover:bg-[#C5A059]/10 transition-colors"
    >
      <History className="w-4 h-4" />
    </Button>
    {/* ... pozostałe przyciski */}
  </div>
</div>
```

---

## 8. Responsywność

Na urządzeniach mobilnych (< 640px):
- Panel rozciąga się do pełnej szerokości minus marginesy
- Wysokość dostosowana do viewport
- Zachowane efekty glassmorphism z mniejszym blur (performance)
- Touch-friendly rozmiary przycisków (min 44x44px)

---

## 9. Dostępność (A11y)

- Kontrast złoty na antracycie: ~7:1 (WCAG AAA)
- Focus states z wyraźnym złotym outline
- Aria labels dla wszystkich interaktywnych elementów
- Reduced motion: wyłączenie animacji dla użytkowników z preferencją

