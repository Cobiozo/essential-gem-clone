

# Plan: Dokończenie rozszerzonej funkcjonalności News Ticker

## Podsumowanie stanu

Podstawowa wersja News Ticker została zaimplementowana, ale **rozszerzenia z planu nie zostały zrealizowane**. Poniżej znajduje się plan dokończenia wszystkich brakujących elementów.

---

## Brakujące elementy do implementacji

### 1. Migracja bazy danych

Dodanie nowych struktur:

```sql
-- Nowa tabela: wybór konkretnych wydarzeń przez admina
CREATE TABLE public.news_ticker_selected_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  is_enabled boolean DEFAULT true,
  custom_label text,
  created_at timestamp with time zone DEFAULT now()
);

-- Rozszerzenie news_ticker_items o nowe kolumny
ALTER TABLE public.news_ticker_items 
  ADD COLUMN target_user_id uuid REFERENCES auth.users(id),
  ADD COLUMN font_size text DEFAULT 'normal' CHECK (font_size IN ('normal', 'large', 'xlarge')),
  ADD COLUMN custom_color text,
  ADD COLUMN effect text DEFAULT 'none' CHECK (effect IN ('none', 'blink', 'pulse', 'glow')),
  ADD COLUMN icon_animation text DEFAULT 'none' CHECK (icon_animation IN ('none', 'bounce', 'spin', 'shake'));
```

### 2. Nowe animacje CSS w tailwind.config.ts

```typescript
keyframes: {
  blink: {
    '0%, 50%, 100%': { opacity: '1' },
    '25%, 75%': { opacity: '0.3' },
  },
  glow: {
    '0%, 100%': { filter: 'drop-shadow(0 0 2px currentColor)' },
    '50%': { filter: 'drop-shadow(0 0 8px currentColor)' },
  },
  shake: {
    '0%, 100%': { transform: 'translateX(0)' },
    '25%': { transform: 'translateX(-2px)' },
    '75%': { transform: 'translateX(2px)' },
  },
},
animation: {
  blink: 'blink 1s ease-in-out 3',
  glow: 'glow 2s ease-in-out infinite',
  shake: 'shake 0.5s ease-in-out infinite',
}
```

### 3. Aktualizacja typów - types.ts

```typescript
export interface TickerItem {
  id: string;
  type: 'webinar' | 'meeting' | 'announcement' | 'banner';
  icon: string;
  content: string;
  isImportant: boolean;
  linkUrl?: string;
  thumbnailUrl?: string;
  sourceId: string;
  priority: number;
  // Nowe pola
  fontSize?: 'normal' | 'large' | 'xlarge';
  customColor?: string;
  effect?: 'none' | 'blink' | 'pulse' | 'glow';
  iconAnimation?: 'none' | 'bounce' | 'spin' | 'shake';
  targetUserId?: string;
}
```

### 4. Aktualizacja TickerItem.tsx

Obsługa nowych stylów i animacji:

- Dynamiczne klasy dla `fontSize` (text-sm, text-base, text-lg)
- Dynamiczne klasy dla `effect` (animate-blink, animate-pulse, animate-glow)
- Dynamiczne klasy dla `iconAnimation` (animate-bounce, animate-spin, animate-shake)
- Obsługa `customColor` przez inline style

### 5. Aktualizacja useNewsTickerData.ts

Zmiany w logice pobierania danych:

- Zamiast automatycznego pobierania wszystkich webinarów/spotkań z 7 dni → pobieranie tylko z tabeli `news_ticker_selected_events`
- Filtrowanie komunikatów po `target_user_id` (jeśli ustawione, pokaż tylko danemu użytkownikowi)
- Mapowanie nowych pól stylowania do interfejsu TickerItem

### 6. Rozbudowa NewsTickerManagement.tsx

Nowa struktura zakładek:

```
Ustawienia | Komunikaty | Wydarzenia | Podgląd
```

#### Zakładka "Wydarzenia":

```
┌─────────────────────────────────────────────────────────────────┐
│  ▼ WEBINARY                                                     │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ☑ Prezentacja Zdrowotno-Naukowa (28.01 18:00)              ││
│  │ ☑ Prezentacja Afiliacyjna (28.01 19:00)                    ││
│  │ ☐ Prezentacja biznesowa (21.01 19:00) - minęło             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ▼ SPOTKANIA ZESPOŁOWE                                          │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ☑ Start nowego partnera (29.01 18:00)                      ││
│  │ ☐ TEAM ZOOM (19.01 19:00) - minęło                         ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  [ Zapisz wybór ]                                               │
└─────────────────────────────────────────────────────────────────┘
```

#### Rozszerzony dialog dodawania/edycji komunikatu:

- Radio button: "Dla wybranych ról" / "Dla konkretnego użytkownika"
- Pole wyszukiwania użytkowników z autocomplete (imię, nazwisko, email)
- Sekcja "Zaawansowane stylowanie" (widoczna gdy is_important=true):
  - Select: Rozmiar czcionki (Normal, Large, XLarge)
  - Color picker: Kolor tekstu
  - Select: Efekt (Brak, Mruganie, Pulsowanie, Glow)
  - Select: Animacja ikony (Brak, Bounce, Spin, Shake)

### 7. Poprawka layoutu NewsTicker.tsx

Weryfikacja i naprawa CSS, który może "ucinać stronę":

- Sprawdzenie `overflow: hidden` na kontenerze
- Weryfikacja `maskImage` w MarqueeContent
- Upewnienie się, że ticker nie wpływa na layout rodzica

---

## Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| **Migracja SQL** | Nowa tabela + ALTER TABLE |
| `src/integrations/supabase/types.ts` | Aktualizacja typów (automatycznie po migracji) |
| `src/components/news-ticker/types.ts` | Dodanie nowych pól do TickerItem |
| `src/components/news-ticker/TickerItem.tsx` | Obsługa stylowania i animacji |
| `src/components/news-ticker/useNewsTickerData.ts` | Nowa logika pobierania wydarzeń + filtrowanie |
| `src/components/news-ticker/NewsTicker.tsx` | Poprawka CSS layoutu |
| `src/components/admin/NewsTickerManagement.tsx` | Zakładka Wydarzenia + formularz z stylowaniem |
| `tailwind.config.ts` | Nowe animacje (blink, glow, shake) |

---

## Kolejność implementacji

1. **Migracja bazy danych** - dodanie tabeli i kolumn
2. **tailwind.config.ts** - nowe animacje CSS
3. **types.ts** - rozszerzenie interfejsów
4. **TickerItem.tsx** - obsługa nowych styli
5. **useNewsTickerData.ts** - nowa logika pobierania
6. **NewsTickerManagement.tsx** - zakładka Wydarzenia + formularz
7. **NewsTicker.tsx** - poprawka layoutu

---

## Przepływ dla admina (po implementacji)

```
1. Admin → Pasek informacyjny → Ustawienia
   - Włącza źródło "Webinary" i "Spotkania"
   
2. Admin → Zakładka "Wydarzenia"
   - Widzi listę wszystkich webinarów i spotkań
   - Zaznacza checkboxy przy tych, które mają się wyświetlać
   - Klika "Zapisz wybór"
   
3. Admin → Zakładka "Komunikaty" → "Dodaj komunikat"
   - Wpisuje treść
   - Wybiera "Dla konkretnego użytkownika"
   - Wyszukuje i wybiera użytkownika
   - Zaznacza "Oznacz jako ważny"
   - W sekcji stylowania ustawia:
     - Rozmiar: Large
     - Kolor: #FF0000
     - Efekt: Mruganie
     - Animacja ikony: Bounce
   - Zapisuje
   
4. Użytkownik widzi spersonalizowany, animowany komunikat
```

