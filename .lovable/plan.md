
# Plan: Rozszerzenie funkcjonalności News Ticker

## Zidentyfikowane problemy i wymagania

Na podstawie analizy kodu i wymagań użytkownika:

### 1. Problem "ucina stronę"
Możliwa przyczyna: animacja marquee z `overflow: hidden` może powodować problemy z layoutem lub CSS mask. Wymaga weryfikacji i poprawki w komponencie NewsTicker.

### 2. Selekcja konkretnych wydarzeń (zamiast automatycznego pobierania)
**Obecny stan:** System automatycznie pobiera WSZYSTKIE webinary i spotkania z najbliższych 7 dni.

**Wymaganie:** Admin chce RĘCZNIE wybierać które konkretne wydarzenia mają być wyświetlane w tickerze poprzez rozwijaną listę.

### 3. Komunikaty dla konkretnych użytkowników
**Obecny stan:** Komunikaty można targetować tylko po rolach (klient, partner, specjalista).

**Wymaganie:** Możliwość wysłania komunikatu do JEDNEGO konkretnego użytkownika.

### 4. Zaawansowane stylowanie ważnych komunikatów
**Obecny stan:** Ważne komunikaty mają tylko pomarańczowy kolor i pulsującą kropkę.

**Wymaganie:** Admin powinien móc edytować:
- Większą czcionkę
- Niestandardowy kolor
- Efekt mrugania
- Animowaną ikonkę

---

## Architektura rozwiązania

### Zmiany w bazie danych

#### 1. Nowa tabela: `news_ticker_selected_events`
Przechowuje ID wydarzeń wybranych przez admina do wyświetlenia:

```sql
CREATE TABLE news_ticker_selected_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  is_enabled boolean DEFAULT true,
  custom_label text, -- opcjonalny nadpisany tekst
  created_at timestamptz DEFAULT now()
);
```

#### 2. Rozszerzenie tabeli `news_ticker_items`
Dodanie kolumn dla targetowania użytkownika i zaawansowanego stylowania:

```sql
ALTER TABLE news_ticker_items ADD COLUMN target_user_id uuid REFERENCES auth.users(id);
ALTER TABLE news_ticker_items ADD COLUMN font_size text DEFAULT 'normal'; -- 'normal', 'large', 'xlarge'
ALTER TABLE news_ticker_items ADD COLUMN custom_color text;
ALTER TABLE news_ticker_items ADD COLUMN effect text; -- 'none', 'blink', 'pulse', 'glow'
ALTER TABLE news_ticker_items ADD COLUMN icon_animation text; -- 'none', 'bounce', 'spin', 'shake'
```

---

## Zmiany w komponentach

### 1. Poprawka "ucina stronę" - `NewsTicker.tsx`

```typescript
// Zmiana w MarqueeContent - usunięcie problematycznych stylów
<div className="flex overflow-hidden relative">
  <div
    ref={contentRef}
    className="flex animate-marquee whitespace-nowrap"
    style={{ animationDuration: `${animationDuration}s` }}
  >
    {/* ... */}
  </div>
</div>
```

### 2. Panel wyboru wydarzeń - `NewsTickerManagement.tsx`

Nowa zakładka "Wydarzenia" z dwiema sekcjami rozwijalnymi:

```text
┌─────────────────────────────────────────────────────────────────┐
│  Ustawienia | Komunikaty | Wydarzenia | Podgląd                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
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
│  │ ☐ Pure Calling (20.01 10:00) - minęło                      ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  [ Zapisz wybór ]                                               │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Formularz komunikatu z wyborem użytkownika

Rozszerzenie dialogu dodawania/edycji komunikatu:

```text
┌─────────────────────────────────────────────────────────────────┐
│  Nowy komunikat                                                 │
├─────────────────────────────────────────────────────────────────┤
│  Treść: [________________________]                              │
│                                                                 │
│  Widoczność:                                                    │
│  ◉ Dla wybranych ról   ○ Dla konkretnego użytkownika           │
│                                                                 │
│  [Jeśli "Dla konkretnego użytkownika":]                        │
│  Wybierz użytkownika: [ Szukaj... ▼ ]                          │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 🔍 Wpisz imię, nazwisko lub email                          ││
│  │ ─────────────────────────────────────────────────────────── ││
│  │ 👤 Jan Kowalski (jan@example.com) - Partner                ││
│  │ 👤 Anna Nowak (anna@example.com) - Klient                  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ☑ Oznacz jako ważny                                            │
│                                                                 │
│  [Jeśli "ważny":]                                               │
│  ┌─ ZAAWANSOWANE STYLOWANIE ──────────────────────────────────┐ │
│  │ Rozmiar czcionki: [Normal ▼] [Large] [XLarge]              │ │
│  │ Kolor tekstu:     [#________] [🎨]                         │ │
│  │ Efekt:            [Brak ▼] [Mruganie] [Pulsowanie] [Glow]  │ │
│  │ Animacja ikony:   [Brak ▼] [Bounce] [Spin] [Shake]         │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  [Anuluj] [Dodaj]                                               │
└─────────────────────────────────────────────────────────────────┘
```

### 4. Rozszerzenie typu `TickerItem`

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
  // Nowe pola dla stylowania
  fontSize?: 'normal' | 'large' | 'xlarge';
  customColor?: string;
  effect?: 'none' | 'blink' | 'pulse' | 'glow';
  iconAnimation?: 'none' | 'bounce' | 'spin' | 'shake';
  targetUserId?: string; // dla komunikatów do konkretnego użytkownika
}
```

### 5. Zaktualizowany `TickerItemComponent`

```typescript
const TickerItemComponent = ({ item }) => {
  const fontSizeClass = {
    normal: 'text-sm',
    large: 'text-base font-semibold',
    xlarge: 'text-lg font-bold',
  }[item.fontSize || 'normal'];

  const effectClass = {
    none: '',
    blink: 'animate-blink',
    pulse: 'animate-pulse',
    glow: 'animate-glow drop-shadow-lg',
  }[item.effect || 'none'];

  const iconAnimationClass = {
    none: '',
    bounce: 'animate-bounce',
    spin: 'animate-spin',
    shake: 'animate-shake',
  }[item.iconAnimation || 'none'];

  return (
    <span
      className={cn(fontSizeClass, effectClass)}
      style={item.customColor ? { color: item.customColor } : undefined}
    >
      <IconComponent className={cn("h-4 w-4", iconAnimationClass)} />
      {item.content}
    </span>
  );
};
```

### 6. Zaktualizowany `useNewsTickerData`

Zmiana logiki pobierania wydarzeń - zamiast automatycznego pobierania, używa tabeli `news_ticker_selected_events`:

```typescript
// PRZED: pobieranie wszystkich webinarów z najbliższych 7 dni
// PO: pobieranie tylko wybranych przez admina wydarzeń

const fetchSelectedEvents = async () => {
  const { data } = await supabase
    .from('news_ticker_selected_events')
    .select(`
      id,
      is_enabled,
      custom_label,
      event:events(id, title, event_type, start_time, zoom_link, image_url)
    `)
    .eq('is_enabled', true);
  
  return data?.filter(item => item.event) || [];
};
```

Dodatkowo: filtrowanie komunikatów po `target_user_id`:

```typescript
// Filtruj komunikaty dla konkretnego użytkownika
const filteredAnnouncements = announcements.filter(item => {
  // Jeśli ma target_user_id, pokaż tylko temu użytkownikowi
  if (item.target_user_id && item.target_user_id !== user?.id) {
    return false;
  }
  // Reszta logiki widoczności per rola...
});
```

---

## Nowe animacje CSS

Dodanie do `tailwind.config.ts`:

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
  blink: 'blink 1s ease-in-out 3',  // mruganie 3 razy
  glow: 'glow 2s ease-in-out infinite',
  shake: 'shake 0.5s ease-in-out infinite',
}
```

---

## Zakres plików do zmiany

| Plik | Zmiana |
|------|--------|
| **Migracja SQL** | Nowa tabela `news_ticker_selected_events` + kolumny w `news_ticker_items` |
| `src/integrations/supabase/types.ts` | Aktualizacja typów po migracji |
| `src/components/news-ticker/types.ts` | Rozszerzenie interfejsów o nowe pola |
| `src/components/news-ticker/NewsTicker.tsx` | Poprawka CSS layoutu |
| `src/components/news-ticker/TickerItem.tsx` | Obsługa nowych styli i animacji |
| `src/components/news-ticker/useNewsTickerData.ts` | Nowa logika pobierania wybranych wydarzeń + filtrowanie po user_id |
| `src/components/admin/NewsTickerManagement.tsx` | Nowa zakładka "Wydarzenia", rozszerzony formularz komunikatów |
| `tailwind.config.ts` | Nowe animacje (blink, glow, shake) |

---

## Przepływ dla admina

```text
1. Admin otwiera "Pasek informacyjny" w panelu
   │
2. Zakładka "Ustawienia" - włącza źródło "Webinary" i "Spotkania"
   │
3. Zakładka "Wydarzenia" - widzi listę wszystkich webinarów i spotkań
   │     - Odznacza te, które NIE mają się pojawiać
   │     - Zaznacza te, które MAJĄ się pojawiać
   │     - Klika "Zapisz wybór"
   │
4. Zakładka "Komunikaty" - dodaje nowy komunikat
   │     - Wybiera "Dla konkretnego użytkownika"
   │     - Wyszukuje "Jan Kowalski"
   │     - Zaznacza "Ważny"
   │     - Ustawia: Rozmiar=Large, Kolor=#FF0000, Efekt=Mruganie, Ikona=Bounce
   │     - Zapisuje
   │
5. Zakładka "Podgląd" - widzi jak wygląda ticker z nowymi ustawieniami
```

---

## Widoczność komunikatów

| Typ targetowania | Kto widzi |
|------------------|-----------|
| Role + wszystkie zaznaczone | Wszyscy z wybranych ról |
| Konkretny użytkownik (`target_user_id`) | TYLKO ten użytkownik |
| Mieszane | Najpierw sprawdź `target_user_id`, potem role |

---

## Responsywność stylowania

Na urządzeniach mobilnych:
- `xlarge` → `large`
- Animacje `shake` wyłączone (mogą być rozpraszające)
- Efekt `glow` uproszczony

```typescript
// W TickerItem
const fontSizeClass = cn(
  item.fontSize === 'xlarge' ? 'text-lg md:text-xl' : '',
  item.fontSize === 'large' ? 'text-base md:text-lg' : '',
);
```
