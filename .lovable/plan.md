
# Plan: Pasek Informacyjny (News Ticker) w Stylu Belki Wiadomości

## Cel

Implementacja dynamicznego paska informacyjnego (ticker/news bar) osadzonego w dolnej części widgetu powitalnego (`WelcomeWidget`). Pasek będzie wyświetlał komunikaty systemowe, ogłoszenia i ważne informacje pobierane z różnych źródeł danych skonfigurowanych przez administratora.

## Wizualizacja

```text
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  WelcomeWidget                                                                          │
│  ┌───────────────────────────────────────────────────────────────────────────────────┐  │
│  │  Dzień dobry, Marcin! 👋                                    🕐 14:32:45  Polska   │  │
│  │  Poniedziałek, 27 Stycznia 2025                                                   │  │
│  └───────────────────────────────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────────────────────────┐  │
│  │ ⚡ WEBINAR: "Nowe produkty 2025" jutro o 18:00 • 📢 Komunikat: Aktualizacja...    │  │ ← News Ticker
│  └───────────────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Źródła danych (konfigurowane przez admina)

Administrator może włączyć/wyłączyć pobieranie z następujących źródeł:

| Źródło | Tabela | Informacja wyświetlana |
|--------|--------|------------------------|
| **Webinary** | `events` (event_type='webinar') | Tytuł + data najbliższego webinaru |
| **Spotkania zespołowe** | `events` (event_type='team_training') | Tytuł + data spotkania |
| **Komunikaty admina** | `news_ticker_items` (NOWA) | Dowolny tekst + ikona + priorytet |
| **Grafiki/miniatury** | `news_ticker_items` | Komunikat z opcjonalną miniaturką |
| **Ważne informacje** | `important_info_banners` (is_ticker=true) | Skrócony tekst bannera |

---

## Struktura bazy danych

### Nowa tabela: `news_ticker_settings`

```sql
CREATE TABLE news_ticker_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  is_enabled boolean DEFAULT true,
  
  -- Widoczność per rola
  visible_to_clients boolean DEFAULT true,
  visible_to_partners boolean DEFAULT true,
  visible_to_specjalista boolean DEFAULT true,
  
  -- Źródła danych (które włączone)
  source_webinars boolean DEFAULT true,
  source_team_meetings boolean DEFAULT true,
  source_announcements boolean DEFAULT true,
  source_important_banners boolean DEFAULT false,
  
  -- Ustawienia animacji
  animation_mode text DEFAULT 'scroll', -- 'scroll' | 'rotate' | 'static'
  scroll_speed integer DEFAULT 50, -- px/s dla marquee
  rotate_interval integer DEFAULT 5, -- sekundy między komunikatami
  
  -- Styl
  background_color text DEFAULT NULL, -- NULL = domyślny gradient
  text_color text DEFAULT NULL,
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

### Nowa tabela: `news_ticker_items`

```sql
CREATE TABLE news_ticker_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Treść
  content text NOT NULL,
  short_description text, -- max 120 znaków dla tickera
  icon text DEFAULT 'info', -- nazwa ikony Lucide
  thumbnail_url text, -- opcjonalna miniatura
  link_url text, -- opcjonalny link
  
  -- Widoczność
  is_active boolean DEFAULT true,
  visible_to_clients boolean DEFAULT true,
  visible_to_partners boolean DEFAULT true,
  visible_to_specjalista boolean DEFAULT true,
  
  -- Priorytet i wyróżnienie
  priority integer DEFAULT 0,
  is_important boolean DEFAULT false, -- wyróżnienie kolorem
  
  -- Harmonogram
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);
```

---

## Architektura komponentów

```text
src/components/
├── news-ticker/
│   ├── NewsTicker.tsx              # Główny komponent tickera
│   ├── TickerItem.tsx              # Pojedynczy element (ikona + tekst)
│   ├── useNewsTickerData.ts        # Hook pobierający dane ze wszystkich źródeł
│   └── index.ts
│
├── admin/
│   └── NewsTickerManagement.tsx    # Panel zarządzania w CMS

src/components/dashboard/widgets/
└── WelcomeWidget.tsx               # Modyfikacja - dodanie tickera w dolnej części
```

---

## Implementacja komponentów

### 1. Hook `useNewsTickerData`

Pobiera dane ze wszystkich włączonych źródeł i łączy je w jedną listę:

```typescript
interface TickerItem {
  id: string;
  type: 'webinar' | 'meeting' | 'announcement' | 'banner';
  icon: string;
  content: string;
  isImportant: boolean;
  linkUrl?: string;
  thumbnailUrl?: string;
  sourceId: string;
}

interface TickerSettings {
  isEnabled: boolean;
  animationMode: 'scroll' | 'rotate' | 'static';
  scrollSpeed: number;
  rotateInterval: number;
  backgroundColor?: string;
  textColor?: string;
}

const useNewsTickerData = () => {
  // 1. Pobierz settings
  // 2. Sprawdź widoczność dla roli użytkownika
  // 3. Pobierz dane z włączonych źródeł
  // 4. Połącz i posortuj po priority
  // 5. Zwróć { items, settings, loading }
};
```

### 2. Komponent `NewsTicker`

```typescript
interface NewsTickerProps {
  className?: string;
}

const NewsTicker: React.FC<NewsTickerProps> = ({ className }) => {
  const { items, settings, loading } = useNewsTickerData();
  const [currentIndex, setCurrentIndex] = useState(0);
  
  if (!settings?.isEnabled || items.length === 0) return null;
  
  // Tryb: scroll (marquee), rotate (zmiana co X sekund), static (wszystkie naraz)
  
  return (
    <div className={cn(
      "relative overflow-hidden rounded-lg bg-gradient-to-r from-muted/50 to-muted/30",
      "border border-border/50 py-2 px-4",
      className
    )}>
      {settings.animationMode === 'scroll' ? (
        <MarqueeContent items={items} speed={settings.scrollSpeed} />
      ) : settings.animationMode === 'rotate' ? (
        <RotatingContent items={items} interval={settings.rotateInterval} />
      ) : (
        <StaticContent items={items} />
      )}
    </div>
  );
};
```

### 3. Animacja Marquee (scroll)

```typescript
const MarqueeContent: React.FC<{ items: TickerItem[]; speed: number }> = ({ items, speed }) => {
  // Płynne przewijanie w poziomie z CSS animation
  // Duplikacja treści dla ciągłego efektu
  
  return (
    <div className="flex animate-marquee whitespace-nowrap">
      {[...items, ...items].map((item, i) => (
        <TickerItem key={`${item.id}-${i}`} item={item} />
      ))}
    </div>
  );
};

// CSS (w tailwind.config lub inline)
// @keyframes marquee {
//   0% { transform: translateX(0); }
//   100% { transform: translateX(-50%); }
// }
```

### 4. Animacja Rotate (zmiana co X sekund)

```typescript
const RotatingContent: React.FC<{ items: TickerItem[]; interval: number }> = ({ items, interval }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, interval * 1000);
    return () => clearInterval(timer);
  }, [items.length, interval]);
  
  return (
    <div className="flex items-center justify-center transition-opacity duration-300">
      <TickerItem item={items[currentIndex]} />
    </div>
  );
};
```

### 5. Komponent `TickerItem`

```typescript
const TickerItem: React.FC<{ item: TickerItem }> = ({ item }) => {
  const IconComponent = (LucideIcons as any)[item.icon] || Info;
  
  const content = (
    <span className={cn(
      "inline-flex items-center gap-2 mx-4",
      item.isImportant && "text-amber-600 dark:text-amber-400 font-medium"
    )}>
      {item.thumbnailUrl ? (
        <img src={item.thumbnailUrl} className="h-5 w-5 rounded object-cover" />
      ) : (
        <IconComponent className="h-4 w-4 flex-shrink-0" />
      )}
      <span className="text-sm">{item.content}</span>
    </span>
  );
  
  if (item.linkUrl) {
    return (
      <a href={item.linkUrl} className="hover:underline" target="_blank">
        {content}
      </a>
    );
  }
  
  return content;
};
```

### 6. Modyfikacja `WelcomeWidget`

Dodanie tickera w dolnej części widgetu:

```typescript
// W WelcomeWidget.tsx
import { NewsTicker } from '@/components/news-ticker';

return (
  <Card className="...">
    <CardContent className="p-6">
      {/* Istniejąca zawartość - powitanie + zegar */}
      <div className="flex flex-col md:flex-row ...">
        {/* ... */}
      </div>
      
      {/* NOWY: News Ticker w dolnej części */}
      <NewsTicker className="mt-4" />
    </CardContent>
  </Card>
);
```

---

## Panel administracyjny

### Komponent `NewsTickerManagement`

Zakładki:
1. **Ustawienia** - włączanie/wyłączanie, wybór źródeł, animacja, kolory
2. **Komunikaty** - lista ręcznych komunikatów (CRUD)
3. **Podgląd** - live preview tickera

```typescript
// Struktura podobna do DailySignalManagement i ImportantInfoManagement
// - Switch do włączania/wyłączania całego tickera
// - Checkboxy widoczności per rola
// - Checkboxy źródeł danych (webinary, spotkania, komunikaty)
// - Select animacji (scroll/rotate/static)
// - Slider prędkości/interwału
// - Color picker dla tła i tekstu
// - Lista komunikatów z możliwością dodawania/edycji/usuwania
```

### Integracja z AdminSidebar

Dodanie nowego elementu menu w kategorii "Funkcje":

```typescript
// W navCategories, features items:
{ value: 'news-ticker', labelKey: 'newsTicker', icon: Newspaper },
```

---

## Widoczność per rola

System widoczności zgodny z istniejącym wzorcem:

| Rola | Widzi ticker jeśli |
|------|-------------------|
| Admin | Zawsze (do testowania) |
| Partner | `visible_to_partners = true` w settings |
| Specjalista | `visible_to_specjalista = true` w settings |
| Klient | `visible_to_clients = true` w settings |

Dodatkowo, każdy komunikat w `news_ticker_items` ma własne flagi widoczności per rola.

---

## Filtrowanie komunikatów per rola

Administrator może określić, która informacja komu się wyświetla:

1. **Globalne ustawienia tickera** - widoczność całego komponentu per rola
2. **Widoczność per komunikat** - każdy wpis w `news_ticker_items` ma flagi `visible_to_*`
3. **Źródła danych dziedziczą widoczność** - np. webinar widoczny tylko dla partnerów pojawi się tylko dla partnerów

---

## Responsywność

- **Desktop**: Pełna szerokość, animacja scroll/rotate
- **Tablet**: Mniejszy font, krótsza animacja
- **Mobile**: Statyczny lub rotate (scroll może być trudny do czytania), tekst może być skrócony

```typescript
// Tailwind responsive classes
<div className={cn(
  "text-sm md:text-base",
  "py-2 md:py-3",
  // Na mobile preferuj rotate zamiast scroll
  settings.animationMode === 'scroll' && "md:animate-marquee"
)}>
```

---

## Sekcja techniczna

### Pliki do utworzenia:

| Plik | Opis |
|------|------|
| `src/components/news-ticker/NewsTicker.tsx` | Główny komponent |
| `src/components/news-ticker/TickerItem.tsx` | Element tickera |
| `src/components/news-ticker/useNewsTickerData.ts` | Hook pobierający dane |
| `src/components/news-ticker/index.ts` | Eksporty |
| `src/components/admin/NewsTickerManagement.tsx` | Panel admina |

### Pliki do modyfikacji:

| Plik | Zmiana |
|------|--------|
| `src/components/dashboard/widgets/WelcomeWidget.tsx` | Dodanie `<NewsTicker />` |
| `src/components/admin/AdminSidebar.tsx` | Dodanie menu "News Ticker" |
| `src/pages/Admin.tsx` | Dodanie case dla 'news-ticker' |
| `src/integrations/supabase/types.ts` | Dodanie typów dla nowych tabel (po migracji) |

### Migracja bazy danych:

```sql
-- Tabela ustawień
CREATE TABLE news_ticker_settings (...);

-- Tabela komunikatów
CREATE TABLE news_ticker_items (...);

-- RLS policies
ALTER TABLE news_ticker_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_ticker_items ENABLE ROW LEVEL SECURITY;

-- Read access dla zalogowanych
CREATE POLICY "Authenticated users can read ticker settings" 
  ON news_ticker_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read active ticker items" 
  ON news_ticker_items FOR SELECT TO authenticated 
  USING (is_active = true);

-- Admin write access
CREATE POLICY "Admins can manage ticker settings" 
  ON news_ticker_settings FOR ALL TO authenticated 
  USING (is_admin());

CREATE POLICY "Admins can manage ticker items" 
  ON news_ticker_items FOR ALL TO authenticated 
  USING (is_admin());
```

### CSS dla animacji marquee:

```css
/* W index.css lub jako plugin tailwind */
@keyframes marquee {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

.animate-marquee {
  animation: marquee var(--marquee-duration, 30s) linear infinite;
}

.animate-marquee:hover {
  animation-play-state: paused;
}
```

---

## Przepływ danych

```text
1. User wchodzi na Dashboard
   │
2. WelcomeWidget renderuje NewsTicker
   │
3. useNewsTickerData:
   ├─ Pobiera news_ticker_settings
   ├─ Sprawdza widoczność dla roli użytkownika
   ├─ Jeśli wyłączony → return { items: [], settings: null }
   │
   ├─ Pobiera dane z włączonych źródeł:
   │   ├─ events (webinary, najbliższe 7 dni)
   │   ├─ events (spotkania zespołowe, najbliższe 7 dni)
   │   ├─ news_ticker_items (aktywne, w harmonogramie)
   │   └─ important_info_banners (is_ticker = true)
   │
   ├─ Filtruje po widoczności per rola
   ├─ Sortuje po priority i dacie
   └─ Zwraca { items, settings, loading }
   │
4. NewsTicker renderuje animację zgodnie z settings.animationMode
```

---

## Podsumowanie

- **Lekki wizualnie** - subtelny gradient, małe ikony, czytelny font
- **Nieinwazyjny** - nie blokuje interfejsu, można zignorować
- **Dynamiczny** - pobiera dane z wielu źródeł w czasie rzeczywistym
- **Konfigurowalny** - admin ma pełną kontrolę nad źródłami, animacją i widocznością
- **Responsywny** - działa na mobile i desktop
- **Zgodny z istniejącą architekturą** - używa tych samych wzorców co DailySignal, ImportantInfo
