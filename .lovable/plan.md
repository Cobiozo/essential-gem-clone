## Cel
1. Naliczać w Bazie Wiedzy realny czas oglądania (tyko gdy wideo faktycznie gra) oraz zaznaczać ukończenie materiału.
2. Poprawić układ Bazy Wiedzy na tablecie (kafelki, przyciski, nagłówek) — obecnie tekst przycisków „Podgląd/Udostępnij" i badge kategorii renderują się pionowo (litera pod literą), timer i tytuł w topbarze też się łamią.

## Zmiany

### 1. Realny czas oglądania (`src/pages/HealthyKnowledgePublicPage.tsx`)
- Podpiąć do `SecureMedia` (dla video/audio) callbacki: `onPlayStateChange`, `onTimeUpdate`, `onDurationChange`.
- Heartbeat tyka wyłącznie kiedy jednocześnie:
  - `document.visibilityState === 'visible'`,
  - `isPlaying === true`,
  - `currentTime` rośnie (ochrona przed pauzą z niezaktualizowanym stanem).
- Sam tick liczony z realnego postępu `currentTime` (delta między próbkami, cap 30 s / ping), nie z czasu ściennego — dzięki temu otwarta karta bez odtwarzania = 0 s.
- Flush przy: pause, hidden, `pagehide`/`beforeunload`, `ended`, unmount (jak dziś, `sendBeacon`).
- Ukończenie: po `ended` lub gdy `currentTime >= duration - 2` wysyłamy dodatkowe pole `completed: true` do edge function; funkcja zapisuje to na sesji.

### 2. Edge function `hk-session-heartbeat`
- Przyjmuje opcjonalne `completed: boolean`.
- Jeśli `true` — ustawia `hk_otp_sessions.completed_at = now()` (jeśli jeszcze puste). Bez zmian w limitach delta.

### 3. Kolumna w bazie
- Migracja: `ALTER TABLE public.hk_otp_sessions ADD COLUMN IF NOT EXISTS completed_at timestamptz;` (bez zmian RLS/grantów — już istnieją).

### 4. Widżety kodów OTP – pokazanie ukończenia
W rozwiniętej sekcji „Dane osoby" dodać:
- `Oglądanie: 12:34` (już jest jako sekundy — pokazać `mm:ss`; jeśli >= duracja lub `completed_at` ustawione → dopisać badge „✅ Ukończone", w przeciwnym razie „⏳ W trakcie").
- Pliki: `src/components/dashboard/widgets/CombinedOtpCodesWidget.tsx`, `src/components/healthy-knowledge/MyHkCodesHistory.tsx` (rozszerzyć `select` o `completed_at`).

### 5. Layout listy Bazy Wiedzy na tablecie (`src/pages/HealthyKnowledge.tsx`)
Bieżący screen: przy 768 px md kicks in i daje 3 kolumny — kafelki są zbyt wąskie, przez co `Podgląd`, `Udostępnij` i badge kategorii łamią się pionowo (jedna litera / linię), a tytuł też się rwie.

- Grid: `grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4` — 2 kolumny na tablecie, 3 dopiero od `lg` (1024+).
- Przyciski akcji: dodać `min-w-0`, `whitespace-nowrap`, `truncate` na tekście; przy `md` pokazywać ikonę + tekst, przy najwęższych szerokościach dopuścić tylko ikonę (breakpoint hidden do `md:inline`, a nie `sm:inline`).
- Badge kategorii („Produkty EQ", „Biznesowe", „Zdrowie ogólne"): `whitespace-nowrap`, `truncate`, `max-w-full`.
- Meta (`views`, `duration`): `min-w-0`, `flex-wrap` z `gap-x-3 gap-y-1`.
- Nagłówek `DashboardLayout` na tej stronie: opakować tytuł/timer w kontener `flex-wrap gap-2` (jeśli topbar to komponent współdzielony, ograniczyć zmiany do klas propsów tej strony, bez ruszania innych ekranów).

## Poza zakresem
- Bez zmian w logice OTP, RLS, walidacji formularza gościa.
- Bez zmian w edytorze V2, Akademii, innych modułach.
- Bez zmian w innych widokach korzystających z topbara.

## Szczegóły techniczne
- Delta liczona jako `Math.max(0, Math.min(30, currentTime - lastReportedTime))` co 15 s tylko przy `isPlaying && visible`. Skoki wstecz (seek) traktowane jako 0.
- `completed_at` chronione warunkiem `IS NULL` w UPDATE, żeby nie nadpisywać najstarszej daty ukończenia przy kolejnych pingach.
- Anti-abuse już istniejące (`MAX_DELTA=30`) pozostaje.