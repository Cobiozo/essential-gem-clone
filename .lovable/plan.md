## Cel

Przeprojektować stronę `/paid-events` tak aby:
1. Sekcja **Nadchodzące** była wizualnie mocno wyeksponowana, a **Zakończone** wyraźnie zdegradowane.
2. Formularz partnerski (link ref) pojawiał się **bezpośrednio pod / obok wydarzenia, którego dotyczy** — zamiast osobnej listy na dole.

Zakres: wyłącznie warstwa prezentacji (`PaidEventsListPage.tsx`, `PaidEventCard.tsx`, `MyEventFormLinks.tsx`). Bez zmian w DB, RLS, edge functions, logice generowania linków, statystykach kliknięć i CRM.

## Nowa struktura strony

```
[Header: ikona + "Eventy" + opis]

╔═══════════════════════════════════════╗
║ ● NADCHODZĄCE WYDARZENIA  (badge: 2)  ║   <- duży nagłówek z akcentem
╚═══════════════════════════════════════╝

┌───────────────────────────────────────┐
│  [Banner]  31 MAJ                     │
│            BUSINESS OPPORTUNITY ŁÓDŹ  │  <- karta wydarzenia (większa, primary border)
│            opis · data · lokalizacja  │
│            [Od 35 zł]      [Zobacz →] │
├───────────────────────────────────────┤
│  ▾ Twój link partnerski (1)           │  <- zagnieżdżony panel ref-link
│    [input z URL] [kopiuj] · 50 klik. │
└───────────────────────────────────────┘

┌───────────────────────────────────────┐
│  [kolejne nadchodzące wydarzenie]     │
│  ▾ formularz pod nim                  │
└───────────────────────────────────────┘

──────────────────────────────────────────
○ Zakończone wydarzenia                       <- mniejszy, wyciszony nagłówek
──────────────────────────────────────────
[karta past — opacity-50, grayscale, bez CTA, bez panelu formularza]
```

## Zmiany per plik

### `PaidEventsListPage.tsx`
- Usunąć osobną sekcję `<MyEventFormLinks />` na dole.
- Dodać pobranie listy aktywnych formularzy (jeden query) + zmapować `event_id → forms[]`, przekazać do `PaidEventCard` jako prop `partnerForms`.
- Sekcja **Nadchodzące**: 
  - nagłówek `text-2xl font-bold` z zieloną kropką-pulse, badge z liczbą.
  - jeśli pusta → dotychczasowy empty-state.
- Sekcja **Zakończone**:
  - separator + nagłówek `text-base text-muted-foreground`, ikona `Archive`.
  - kontener `opacity-60`, brak panelu partnerskiego.
- Layout pojedyncza kolumna (max-w-4xl), rytm pionowy `space-y-4`.

### `PaidEventCard.tsx`
- Nowy prop `partnerForms?: Form[]` (przekazywany tylko dla nadchodzących).
- Wizualnie wyraźniejsze odróżnienie:
  - **upcoming**: `border-l-4 border-primary`, hover ring, pełna kolorystyka, badge "NADCHODZI" (subtelny, primary/10).
  - **past**: `grayscale opacity-60`, badge "ZAKOŃCZONE" (muted), brak `Zobacz →`, klik nadal działa (otwiera detal).
- Pod treścią karty: jeśli `partnerForms?.length`, render `<MyEventFormLinks eventId={event.id} compact />` w wewnętrznej sekcji `border-t bg-muted/30 p-4` z nagłówkiem "Twój link partnerski" + ikona `Link2`. Wykorzystanie istniejącego trybu `compact` + `eventId` (już zaimplementowane).
- Zachować obecne pola (data-block, banner, cena, miejsca, sold-out, klik nawigujący).

### `MyEventFormLinks.tsx`
- Bez zmian funkcjonalnych. Sprawdzić tylko, że tryb `compact + eventId` poprawnie filtruje (już tak działa w queryKey).
- Drobny tweak stylu: gdy `compact`, mniejsze paddingi (`pt-3` zamiast `pt-5`), aby ładnie siadał wewnątrz karty wydarzenia.

## Gwarancje nienaruszalności
- DB / RLS / edge functions / `paid_event_partner_links` / `event_form_submissions` — bez zmian.
- Logika `generateLink`, `copy`, statystyki kliknięć i zapisanych — bez zmian.
- Komponent `MyEventFormLinks` zachowuje API; nadal użyteczny solo na innych stronach (np. `MyPartnerPage`).
- Routing i nawigacja do `/events/:slug` — bez zmian.
- Tłumaczenia `tf(...)` zachowane; nowe etykiety dodane z fallbackiem PL.
