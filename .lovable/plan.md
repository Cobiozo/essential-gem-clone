

# Plan: Podpowiedzi UX - Tooltips nawigacyjne + Ikony informacyjne w widżetach

## Cel

Ułatwić użytkownikom nawigację i zrozumienie funkcji poprzez:
1. **Tooltips przy najechaniu** - po 2 sekundach pojawia się opis co znajdzie użytkownik w danym miejscu nawigacji
2. **Ikona "i" w widżetach** - mała ikona informacyjna w lewym górnym rogu każdego widżetu, po kliknięciu wyświetla opis do czego służy widżet

---

## Część 1: Tooltips z opóźnieniem dla nawigacji

### Lokalizacja
Elementy menu w `DashboardSidebar.tsx` - każdy przycisk nawigacyjny

### Implementacja
Wykorzystamy istniejący komponent `Tooltip` z Radix UI, ale dodamy `delayDuration={2000}` (2 sekundy).

### Opisy dla elementów nawigacji

| ID elementu | Opis podpowiedzi |
|------------|------------------|
| dashboard | Twoja strona główna z podglądem wszystkich najważniejszych informacji |
| academy | Szkolenia i materiały edukacyjne - zdobywaj wiedzę i certyfikaty |
| healthy-knowledge | Materiały o zdrowym stylu życia i produktach |
| resources | Biblioteka dokumentów, grafik i materiałów do pobrania |
| pureContacts | Zarządzaj kontaktami prywatnymi i zespołowymi |
| news | Aktualności i ważne ogłoszenia od zespołu |
| events | Webinary, spotkania zespołowe i indywidualne konsultacje |
| chat | Komunikacja z upline i zespołem |
| support | Potrzebujesz pomocy? Wyślij zgłoszenie do zespołu wsparcia |
| reflinks | Twoje unikalne linki polecające - śledź kliknięcia |
| infolinks | Przydatne linki i materiały informacyjne |
| community | Dołącz do społeczności na różnych platformach |
| settings | Ustawienia profilu, powiadomień i preferencji |
| calculator | Kalkulator prowizji i symulacje zarobków |
| admin | Panel administracyjny - zarządzanie systemem |

### Zmiany w kodzie

**Plik: `src/components/dashboard/DashboardSidebar.tsx`**

1. Dodać mapę opisów dla tooltipów:
```typescript
const menuTooltipDescriptions: Record<string, string> = {
  dashboard: 'Twoja strona główna z podglądem wszystkich najważniejszych informacji',
  academy: 'Szkolenia i materiały edukacyjne - zdobywaj wiedzę i certyfikaty',
  'healthy-knowledge': 'Materiały o zdrowym stylu życia i produktach',
  resources: 'Biblioteka dokumentów, grafik i materiałów do pobrania',
  pureContacts: 'Zarządzaj kontaktami prywatnymi i zespołowymi',
  news: 'Aktualności i ważne ogłoszenia od zespołu',
  events: 'Webinary, spotkania zespołowe i indywidualne konsultacje',
  chat: 'Komunikacja z upline i zespołem',
  support: 'Potrzebujesz pomocy? Wyślij zgłoszenie do zespołu wsparcia',
  reflinks: 'Twoje unikalne linki polecające - śledź kliknięcia',
  infolinks: 'Przydatne linki i materiały informacyjne',
  community: 'Dołącz do społeczności na różnych platformach',
  settings: 'Ustawienia profilu, powiadomień i preferencji',
  calculator: 'Kalkulator prowizji i symulacje zarobków',
  admin: 'Panel administracyjny - zarządzanie systemem',
};
```

2. Rozszerzyć renderowanie menu o `Tooltip` z `delayDuration={2000}`:
```tsx
<Tooltip delayDuration={2000}>
  <TooltipTrigger asChild>
    <SidebarMenuButton ...>
      ...
    </SidebarMenuButton>
  </TooltipTrigger>
  <TooltipContent side="right" className="max-w-xs">
    {menuTooltipDescriptions[item.id]}
  </TooltipContent>
</Tooltip>
```

---

## Część 2: Ikona "i" w widżetach dashboardu

### Lokalizacja
Każdy widżet na dashboardzie - mała ikona w lewym górnym rogu nagłówka

### Komponent pomocniczy
Stworzymy reużywalny komponent `WidgetInfoButton`:

**Nowy plik: `src/components/dashboard/WidgetInfoButton.tsx`**

```typescript
import React from 'react';
import { Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface WidgetInfoButtonProps {
  description: string;
}

export const WidgetInfoButton: React.FC<WidgetInfoButtonProps> = ({ description }) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="absolute top-2 left-2 z-10 h-5 w-5 rounded-full bg-muted/80 hover:bg-muted flex items-center justify-center transition-colors"
          aria-label="Informacja o widżecie"
        >
          <Info className="h-3 w-3 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent 
        side="right" 
        align="start" 
        className="w-64 text-sm"
      >
        {description}
      </PopoverContent>
    </Popover>
  );
};
```

### Opisy dla widżetów

| Widżet | Opis |
|--------|------|
| WelcomeWidget | Powitanie i aktualny czas - dostosuj strefę czasową według potrzeb |
| CalendarWidget | Kalendarz wydarzeń - kliknij dzień aby zobaczyć zaplanowane webinary i spotkania. Kliknij kategorię w legendzie aby filtrować |
| MyMeetingsWidget | Twoje nadchodzące spotkania - zapisane webinary i zaplanowane konsultacje |
| TrainingProgressWidget | Postęp w szkoleniach - śledź ukończone moduły i kontynuuj naukę |
| NotificationsWidget | Centrum powiadomień - ważne informacje od upline i systemu |
| ResourcesWidget | Najnowsze materiały z biblioteki - pobieraj dokumenty i grafiki |
| TeamContactsWidget | Szybki dostęp do kontaktów zespołowych i wyszukiwarki specjalistów |
| ReflinksWidget | Twoje linki polecające - kopiuj i śledź statystyki kliknięć |
| InfoLinksWidget | Przydatne linki zewnętrzne skonfigurowane przez administrację |
| HealthyKnowledgeWidget | Wyróżnione materiały edukacyjne o zdrowym stylu życia |
| CombinedOtpCodesWidget | Kody jednorazowe dla Twoich podopiecznych - monitoruj dostępy |
| ActiveUsersWidget | Aktualnie zalogowani użytkownicy w systemie (tylko dla administratorów) |

### Zmiany w widżetach

Każdy widżet otrzyma:
1. Wrapper `relative` dla Card
2. Komponent `WidgetInfoButton` z odpowiednim opisem

**Przykład dla CalendarWidget:**
```tsx
import { WidgetInfoButton } from './WidgetInfoButton';

// W return:
<Card data-tour="calendar-widget" className="shadow-sm relative">
  <WidgetInfoButton description="Kalendarz wydarzeń - kliknij dzień aby zobaczyć zaplanowane webinary i spotkania. Kliknij kategorię w legendzie aby filtrować." />
  <CardHeader className="pb-2">
    ...
  </CardHeader>
  ...
</Card>
```

---

## Pliki do modyfikacji/utworzenia

| Plik | Zmiana |
|------|--------|
| `src/components/dashboard/WidgetInfoButton.tsx` | **NOWY** - komponent ikony "i" |
| `src/components/dashboard/DashboardSidebar.tsx` | Dodanie tooltipów z opóźnieniem 2s |
| `src/components/dashboard/widgets/WelcomeWidget.tsx` | Dodanie WidgetInfoButton |
| `src/components/dashboard/widgets/CalendarWidget.tsx` | Dodanie WidgetInfoButton |
| `src/components/dashboard/widgets/MyMeetingsWidget.tsx` | Dodanie WidgetInfoButton |
| `src/components/dashboard/widgets/TrainingProgressWidget.tsx` | Dodanie WidgetInfoButton |
| `src/components/dashboard/widgets/NotificationsWidget.tsx` | Dodanie WidgetInfoButton |
| `src/components/dashboard/widgets/ResourcesWidget.tsx` | Dodanie WidgetInfoButton |
| `src/components/dashboard/widgets/TeamContactsWidget.tsx` | Dodanie WidgetInfoButton |
| `src/components/dashboard/widgets/ReflinksWidget.tsx` | Dodanie WidgetInfoButton |
| `src/components/dashboard/widgets/InfoLinksWidget.tsx` | Dodanie WidgetInfoButton |
| `src/components/dashboard/widgets/HealthyKnowledgeWidget.tsx` | Dodanie WidgetInfoButton |
| `src/components/dashboard/widgets/CombinedOtpCodesWidget.tsx` | Dodanie WidgetInfoButton |
| `src/components/dashboard/widgets/ActiveUsersWidget.tsx` | Dodanie WidgetInfoButton |

---

## Wizualizacja

**Sidebar z tooltipem (po 2s najechania):**
```text
┌──────────────────┐     ┌─────────────────────────────────────────┐
│ 📊 Dashboard     │ ──► │ Twoja strona główna z podglądem        │
│ 🎓 Akademia      │     │ wszystkich najważniejszych informacji  │
│ 💚 Zdrowa Wiedza │     └─────────────────────────────────────────┘
│ 📁 Biblioteka    │
└──────────────────┘
```

**Widżet z ikoną "i":**
```text
┌─────────────────────────────────────────┐
│ (i)                                     │
│    📅 Kalendarz wydarzeń     [Zobacz ►] │
│    ┌─────────────────────────────────┐  │
│    │ Pn Wt Śr Cz Pt Sb Nd           │  │
│    │  1  2  3  4  5  6  7           │  │
│    │ ...                            │  │
│    └─────────────────────────────────┘  │
└─────────────────────────────────────────┘

Po kliknięciu (i):
┌────────────────────────────┐
│ Kalendarz wydarzeń -       │
│ kliknij dzień aby zobaczyć │
│ zaplanowane webinary i     │
│ spotkania.                 │
└────────────────────────────┘
```

---

## Korzyści

1. **Samouczący się interfejs** - użytkownicy poznają funkcje bez czytania dokumentacji
2. **Nie przeszkadza** - tooltip pojawia się dopiero po 2 sekundach, więc nie irytuje przy szybkiej nawigacji
3. **Zawsze dostępne** - ikona "i" jest subtelna ale widoczna gdy potrzebna
4. **Spójność** - jednolity styl podpowiedzi w całej aplikacji

---

## Sekcja techniczna

### Import TooltipProvider
`DashboardSidebar.tsx` musi być opakowany w `TooltipProvider` (prawdopodobnie już jest w `SidebarProvider`)

### Pozycjonowanie ikony "i"
- `absolute top-2 left-2` - pozycja w lewym górnym rogu
- `z-10` - nad innymi elementami
- `h-5 w-5` - mały rozmiar (20x20px)
- `rounded-full` - okrągła

### Styl popover
- `w-64` - szerokość 256px
- `text-sm` - mały tekst
- `side="right"` - pojawia się po prawej stronie ikony

### Tooltip delay
- Używamy `delayDuration={2000}` z Radix Tooltip
- Tooltip znika natychmiast po zjechaniu myszką

