## Zmiany w e-mailu „Zapisz się"

### 1. Nowy, czysty layout maila (`process-event-email-campaigns/index.ts` → `buildEmailHtml`)

- **CTA wycentrowany** — `<table align="center" width="100%">` z komórką `align="center"`, żółty przycisk na środku karty (obecnie „wpada" po lewej z niewłaściwej tabeli).
- **Jedna zwarta karta** (max 560 px, marginesy 24 px), spójna z brandem PLC:
  - Górny akcent (żółty pasek), tytuł 22 px bold.
  - Zdjęcie wydarzenia z zaokrąglonymi rogami (jeśli jest).
  - Blok „Termin / Prowadzący / Miejsce" jako mini-tabela (ikony ✦ zastąpione emoji 📅 👤 📍).
  - Opis w mniejszym rozmiarze, wyszarzony, obcięty do ~400 znaków.
  - **CTA `Zapisz się`** — pełna szerokość karty na mobile, ~260 px na desktopie, wycentrowany, żółte tło `#eab308`, ciemny tekst, `border-radius: 10px`, `padding: 16px 32px`.
  - Sub-link „Zobacz szczegóły" pod przyciskiem (mały, wycentrowany).
  - Usuwam duplikat „Jeżeli przycisk nie działa" + „Nie jesteś zalogowany" → jeden neutralny footer.
- Preheader (ukryty tekst) z tytułem wydarzenia i terminem — poprawia podgląd w skrzynce.

### 2. Docelowa strona po kliknięciu — od razu widok wydarzenia

Link CTA pozostaje: `${APP_ORIGIN}/events/team-meetings?event=<id>&utm=email_invite` (webinary analogicznie).

Strona `TeamMeetingsPage` / `WebinarsPage` już czyta `?event=<id>` i przekazuje `defaultOpen` do `EventCardCompact`. Dodam:
- **Auto-scroll** do rozwiniętej karty (`ref` + `scrollIntoView({ behavior: 'smooth', block: 'center' })` w `useEffect`, gdy `highlightedEventId` istnieje i dane się załadują).
- **Delikatny highlight** (pierścień `ring-2 ring-primary`) na 3 s dla lepszej orientacji.

Po tym zalogowany użytkownik zobaczy dokładnie kartę „O!Mega Chill" z widocznym przyciskiem **„Zapisz się"** (tak jak na screenie).

### 3. Ścieżka niezalogowanego użytkownika

W obu stronach (`TeamMeetingsPage`, `WebinarsPage`) dodam guard:

```
if (!user && !authLoading) {
  const returnUrl = `${pathname}${search}`;
  navigate(`/auth?n=${encodeURIComponent(returnUrl)}`, { replace: true });
}
```

Wzorzec `?n=` jest już obsługiwany przez `src/pages/Auth.tsx` (po zalogowaniu robi `redirect` do wartości `n`). Efekt: kliknięcie CTA w mailu → jeśli nie zalogowany, natychmiast okno logowania → po zalogowaniu **wraca** dokładnie do `/events/team-meetings?event=<id>` z rozwiniętą kartą i przyciskiem „Zapisz się".

### Pliki do zmiany

- `supabase/functions/process-event-email-campaigns/index.ts` — nowy HTML maila + wywołanie `deploy_edge_functions` po edycji.
- `src/pages/TeamMeetingsPage.tsx` — auto-scroll + highlight + auth guard z `?n=`.
- `src/pages/WebinarsPage.tsx` — to samo (auto-scroll + auth guard) dla spójności.

Nie zmieniam logiki wysyłki ani schematu bazy — tylko warstwa prezentacyjna maila + UX docelowej strony.
