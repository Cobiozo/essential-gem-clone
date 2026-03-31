

# Widżet "Zaproś na Webinar" — Dashboard

## Cel
Nowy widżet full-width na dashboardzie, tuż pod WelcomeWidget, umożliwiający partnerom szybkie pozyskanie terminu auto-webinaru i wysłanie zaproszenia do gościa. Dwie kolumny: Business Opportunity i Health Conversation.

## Lokalizacja
Poniżej `<WelcomeWidget />`, powyżej siatki 3-kolumnowej. Full-width z ikoną LIVE i pulsującą czerwoną kropką.

## Wygląd i zachowanie

```text
┌──────────────────────────────────────────────────────────┐
│ 🔴 LIVE  Zaproś gościa na webinar                       │
├────────────────────────────┬─────────────────────────────┤
│ ▼ Business Opportunity     │ ▼ Health Conversation       │
│   (kliknij aby rozwinąć)   │   (kliknij aby rozwinąć)   │
│                            │                             │
│  Dziś | Jutro | Pojutrze   │  Dziś | Jutro | Pojutrze   │
│  09:00  10:00  11:00 ...   │  09:00  10:00  11:00 ...   │
│  [wybierz slot]            │  [wybierz slot]             │
│                            │                             │
│  🇵🇱 [📋 Kopiuj zaproszenie] │  🇵🇱 [📋 Kopiuj zaproszenie] │
│       [📤 Udostępnij]      │       [📤 Udostępnij]       │
└────────────────────────────┴─────────────────────────────┘
```

- Obie kolumny domyślnie zwinięte (Collapsible) — kliknięcie rozwija sloty
- Na mobile: jedna kolumna (stack)
- Sloty pobierane z `auto_webinar_config` per kategoria (reuse `useAutoWebinarConfig`)
- Slot LIVE → pulsująca czerwona kropka + badge "LIVE", niedostępny do zaproszenia
- Slot przeszły → wyszarzony, przekreślony
- Po wybraniu slotu: przycisk "Kopiuj zaproszenie" + wybór języka (flagi)
- Na mobile: przycisk "Udostępnij" → `navigator.share()` (SMS, WhatsApp, Messenger itd.)
- Na desktop: przycisk kopiuje tekst zaproszenia do schowka
- Widżet widoczny tylko dla partnerów, specjalistów i adminów (nie klientów)
- Jeśli obie kategorie wyłączone (`is_enabled=false`), widżet się nie renderuje

## Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `src/components/dashboard/widgets/WebinarInviteWidget.tsx` | **NOWY** — pełna logika widżetu z dwoma kolumnami BO/HC, sloty, kopiowanie, udostępnianie |
| `src/pages/Dashboard.tsx` | Dodanie lazy importu + `<Suspense>` pod WelcomeWidget |

## Szczegóły techniczne

### `WebinarInviteWidget.tsx`
- Używa `useAutoWebinarConfig('business_opportunity')` i `useAutoWebinarConfig('health_conversation')`
- Pobiera `linkedEvent` (slug) per config via `config.event_id`
- Logika slotów: reuse z `AutoWebinarEventView` (slot_hours, getSlotStatus, grouped by period)
- Kopiowanie: `copyToClipboard()` + `getInvitationLabels()` + `getDateLocale()`
- Udostępnianie (mobile): `navigator.share({ title, text, url })` z wykryciem `isMobileDevice()`
- Widoczność: `useAuth()` → `isPartner || isAdmin || profile?.role === 'specjalista'`
- Collapsible per kategoria z `Collapsible` z shadcn lub prosty `useState<boolean>`
- Ikona LIVE w nagłówku z `Radio` + pulsująca kropka CSS `animate-pulse`

### `Dashboard.tsx`
- `const WebinarInviteWidget = lazy(() => import(...))`
- Wstawiony między `<WelcomeWidget />` a `<div className="grid ...">` z `<Suspense fallback={<WidgetSkeleton />}>`

