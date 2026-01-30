

# Plan: Uruchomienie wydarzenia i dodanie modułu EVENTY do sidebara

## Cel

1. Uruchomić dane testowe wydarzenia "LinkedIn w Firmie" w bazie danych
2. Stworzyć publiczną stronę z listą płatnych eventów
3. Dodać moduł "EVENTY" do bocznego panelu nawigacyjnego (Dashboard Sidebar)

---

## Architektura rozwiązania

```text
┌──────────────────────────────────────────────────────────────┐
│                    DASHBOARD SIDEBAR                          │
│  ┌──────────────────────────────────────────────────────────┐│
│  │  🏠 Dashboard                                            ││
│  │  🎓 Akademia                                             ││
│  │  ...                                                     ││
│  │  📅 Wydarzenia                                           ││
│  │     ├── Webinary                                         ││
│  │     ├── Spotkania zespołowe                              ││
│  │     └── Spotkania indywidualne                           ││
│  │  🎫 EVENTY (NOWY!) ─────────────────────────────────────►││───────┐
│  │  ...                                                     ││       │
│  └──────────────────────────────────────────────────────────┘│       │
└──────────────────────────────────────────────────────────────┘       │
                                                                        │
                                                                        ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                          /paid-events                                              │
│  ┌───────────────────────────────────────────────────────────────────────────────┐│
│  │                           Płatne wydarzenia                                   ││
│  │  ─────────────────────────────────────────────────────────────────────────    ││
│  │                                                                               ││
│  │  ┌─────────────────────────────────────────────────────────────────────────┐ ││
│  │  │                    Nadchodzące wydarzenia                               │ ││
│  │  │  ┌─────────────────────────────────────────────────────────────────┐   │ ││
│  │  │  │ 📅 20 lut 2026  │  LinkedIn w Firmie                            │   │ ││
│  │  │  │                 │  Kompleksowe szkolenie...                     │   │ ││
│  │  │  │  🌐 Online      │                          [Zobacz szczegóły →] │   │ ││
│  │  │  │  💰 od 648 zł   │                                               │   │ ││
│  │  │  └─────────────────────────────────────────────────────────────────┘   │ ││
│  │  │                                                                         │ ││
│  │  │  ┌─────────────────────────────────────────────────────────────────┐   │ ││
│  │  │  │ 📅 15 mar 2026  │  Kolejne wydarzenie...                        │   │ ││
│  │  │  │                 │  ...                                          │   │ ││
│  │  │  └─────────────────────────────────────────────────────────────────┘   │ ││
│  │  └─────────────────────────────────────────────────────────────────────────┘ ││
│  └───────────────────────────────────────────────────────────────────────────────┘│
│                                                                                    │
│                                     KLIK                                           │
│                                       │                                            │
│                                       ▼                                            │
│                          /events/linkedin-w-firmie                                 │
│                        (Istniejąca strona szczegółów)                              │
└───────────────────────────────────────────────────────────────────────────────────┘
```

---

## Kroki implementacji

### Krok 1: Uruchomienie danych testowych (SQL)

Wykonam skrypt `scripts/seed-linkedin-event.sql` bezpośrednio z Supabase SQL Editor. Skrypt utworzy:
- 1 wydarzenie główne (`paid_events`)
- 5 sekcji treści CMS (`paid_event_content_sections`)
- 2 pakiety biletów (`paid_event_tickets`)
- 1 prelegenta (`paid_event_speakers`)

---

### Krok 2: Nowa strona publiczna - Lista płatnych eventów

**Plik:** `src/pages/PaidEventsListPage.tsx`

Strona wzorowana na `WebinarsPage.tsx`, wyświetlająca:
- Nagłówek z ikoną 🎫 i tytułem "Eventy"
- Listę nadchodzących wydarzeń (karty z datą, tytułem, ceną, lokalizacją)
- Listę zakończonych wydarzeń (opcjonalnie)
- Link do szczegółów każdego wydarzenia `/events/:slug`

**Pobieranie danych:**
```sql
SELECT * FROM paid_events 
WHERE is_published = true AND is_active = true
ORDER BY event_date ASC
```

---

### Krok 3: Komponent karty wydarzenia

**Plik:** `src/components/paid-events/PaidEventCard.tsx`

Karta wydarzenia zawierająca:
- Datę (format: "20 lut 2026")
- Tytuł wydarzenia
- Krótki opis
- Znacznik "Online" lub lokalizację
- Najniższą cenę (z tabeli `paid_event_tickets`)
- Przycisk "Zobacz szczegóły →"

---

### Krok 4: Dodanie trasy w App.tsx

```typescript
<Route path="/paid-events" element={<PaidEventsListPage />} />
```

---

### Krok 5: Dodanie "EVENTY" do DashboardSidebar

**Plik:** `src/components/dashboard/DashboardSidebar.tsx`

Dodanie nowego elementu menu:
```typescript
{ 
  id: 'paid-events', 
  icon: Ticket, 
  labelKey: 'Eventy', 
  path: '/paid-events' 
},
```

Umieszczenie po istniejących "Wydarzenia" (events).

---

## Szczegóły techniczne

### Nowe pliki do utworzenia

| Plik | Opis |
|------|------|
| `src/pages/PaidEventsListPage.tsx` | Strona listy płatnych eventów |
| `src/components/paid-events/PaidEventCard.tsx` | Karta pojedynczego wydarzenia |

### Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/App.tsx` | Dodanie trasy `/paid-events` |
| `src/components/dashboard/DashboardSidebar.tsx` | Dodanie pozycji "Eventy" w menu |

---

## Widoczność modułu

Moduł "EVENTY" będzie widoczny dla:
- Wszystkich zalogowanych użytkowników (partners, clients, specjaliści)
- Brak ograniczeń per rola (każdy może przeglądać i kupować bilety)

---

## Efekt końcowy

Po implementacji:
1. ✅ W bazie danych pojawi się wydarzenie "LinkedIn w Firmie" z pełną treścią
2. ✅ W bocznym menu pojawi się nowa pozycja "Eventy" z ikoną biletu
3. ✅ Po kliknięciu otworzy się strona `/paid-events` z listą nadchodzących wydarzeń
4. ✅ Kliknięcie w wydarzenie przeniesie na stronę szczegółów `/events/linkedin-w-firmie`
5. ✅ Użytkownik może kupić bilet (istniejący flow PayU)

