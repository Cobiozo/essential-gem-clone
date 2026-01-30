
# Plan: Strona publiczna wydarzenia płatnego z edytowalnym CMS

## Przegląd

Stworzenie publicznej strony landing page dla wydarzeń płatnych (Ticket Shop), która będzie:
- Dostępna pod ścieżką `/events/[slug]`
- Wyglądać podobnie do referencyjnych zrzutów ekranu (sekcje: O szkoleniu, Dlaczego warto, Program, Prelegenci, Cennik)
- W pełni edytowalna z poziomu panelu administracyjnego
- Zintegrowana z istniejącym systemem płatności PayU

---

## Architektura rozwiązania

```text
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                          PUBLIC LANDING PAGE STRUCTURE                              │
│                             /events/[slug]                                          │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │ HERO SECTION (z bazy paid_events)                                           │   │
│  │ - Banner image, tytuł, krótki opis, data, lokalizacja                       │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                     │
│  ┌───────────────────────────────────────┐  ┌─────────────────────────────────┐   │
│  │ MAIN CONTENT (scrollable)             │  │ STICKY SIDEBAR                   │   │
│  │                                       │  │                                   │   │
│  │ ┌───────────────────────────────────┐ │  │ - Pakiety biletów                │   │
│  │ │ Navigation Tabs (scroll anchors) │ │  │   (paid_event_tickets)            │   │
│  │ │ O szkoleniu | Program | Prelegenci│ │  │ - Wybór pakietu                  │   │
│  │ └───────────────────────────────────┘ │  │ - Przycisk "Kup bilet"           │   │
│  │                                       │  │ - Countdown do wydarzenia        │   │
│  │ EDITABLE CMS SECTIONS:                │  │                                   │   │
│  │ ├── O szkoleniu (content_sections)    │  └─────────────────────────────────┘   │
│  │ ├── Dlaczego warto wziąć udział?      │                                        │
│  │ ├── Kto powinien wziąć udział?        │                                        │
│  │ ├── Program szkolenia (schedule)      │                                        │
│  │ ├── Czas trwania                      │                                        │
│  │ └── Prelegenci (speakers)             │                                        │
│  │                                       │                                        │
│  └───────────────────────────────────────┘                                        │
│                                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │ PURCHASE MODAL/DRAWER                                                        │   │
│  │ - Formularz danych kupującego                                                │   │
│  │ - Podsumowanie zamówienia                                                    │   │
│  │ - Przekierowanie do PayU                                                     │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Modyfikacja bazy danych

### Nowa tabela: `paid_event_content_sections`

Tabela umożliwiająca administratorowi dodawanie niestandardowych sekcji treści do każdego wydarzenia.

| Kolumna | Typ | Opis |
|---------|-----|------|
| id | uuid | Klucz główny |
| event_id | uuid FK | Powiązanie z wydarzeniem |
| section_type | text | Typ: 'about', 'why_join', 'for_whom', 'custom', 'duration' |
| title | text | Tytuł sekcji (np. "Dlaczego warto wziąć udział?") |
| content | text | Treść HTML/Rich text |
| position | int | Kolejność wyświetlania |
| is_active | boolean | Czy widoczna |
| background_color | text | Kolor tła sekcji (opcjonalnie) |
| text_color | text | Kolor tekstu (opcjonalnie) |
| created_at, updated_at | timestamptz | Znaczniki czasu |

### Rozszerzenie tabeli `paid_events`

Dodanie pól do obsługi rozszerzonego opisu wydarzenia:

| Kolumna | Typ | Opis |
|---------|-----|------|
| content_sections_enabled | boolean | Czy używać sekcji CMS |
| show_schedule | boolean | Czy pokazywać harmonogram |
| show_speakers | boolean | Czy pokazywać prelegentów |
| sidebar_title | text | Tytuł sidebara (np. "Rejestracja") |
| sidebar_cta_text | text | Tekst przycisku (np. "Zapisz się →") |

---

## 2. Komponenty frontendowe

### Strona główna: `src/pages/PaidEventPage.tsx`

Nowa strona routowana jako `/events/:slug`:

```text
Struktura komponentu:
├── PaidEventPage.tsx (główny kontener)
│   ├── PaidEventHero.tsx (banner, tytuł, meta)
│   ├── PaidEventNavigation.tsx (scroll anchors)
│   ├── PaidEventContent.tsx (sekcje CMS)
│   │   ├── AboutSection.tsx
│   │   ├── WhyJoinSection.tsx
│   │   ├── ForWhomSection.tsx
│   │   ├── ScheduleSection.tsx
│   │   ├── DurationSection.tsx
│   │   ├── SpeakersSection.tsx
│   │   └── CustomSection.tsx
│   ├── PaidEventSidebar.tsx (sticky pricing)
│   │   ├── TicketSelector.tsx
│   │   ├── PriceDisplay.tsx
│   │   └── CountdownTimer.tsx
│   └── PurchaseDrawer.tsx (formularz zakupu)
```

### Komponenty sekcji (zgodne z designem referencyjnym)

**AboutSection.tsx** - "O szkoleniu"
- Tytuł H2 w kolorze granatowym
- Treść jako HTML/rich text
- Opcjonalny obraz/grafika

**WhyJoinSection.tsx** - "Dlaczego warto wziąć udział?"
- Karty z ikonami
- Bullet points z kolorowym tekstem

**ProgramSection.tsx** - "Program szkolenia"
- Struktura hierarchiczna
- Bullet lists z zakreśleniami
- Sekcje tematyczne

**SpeakersSection.tsx** - "Prelegenci"
- Tło w kolorze akcentowym (niebieski jak na screenie)
- Karty prelegentów ze zdjęciem, imieniem, tytułem, bio
- Okrągłe zdjęcia z ramką

**SidebarPricing.tsx**
- Sticky sidebar przy scrollowaniu
- Nagłówek "Rejestracja"
- Wybór terminu (jeśli wiele dat)
- Cena z VAT
- Lista "Cena zawiera" z checkmarkami
- CTA button "Zapisz się →"

---

## 3. Panel administracyjny - rozszerzenia

### Nowe komponenty edycji

**PaidEventContentEditor.tsx**
- Lista edytowalnych sekcji treści
- Drag & drop sortowanie sekcji
- Dodawanie/usuwanie sekcji
- Rich text editor dla każdej sekcji (wykorzysta istniejący TextEditor)

**PaidEventSpeakersEditor.tsx** 
- Formularz dodawania prelegentów
- Upload zdjęć (integracja z Media Library)
- Edycja bio, tytułu, pozycji

**PaidEventScheduleEditor.tsx**
- Edycja punktów harmonogramu
- Time slots + tytuły + opisy
- Przypisywanie prelegentów do punktów

**PaidEventTicketsEditor.tsx**
- Zarządzanie pakietami biletów
- Cena, opis, ilość, daty sprzedaży
- Lista "co zawiera" jako tablica tekstów

---

## 4. Routing i integracja

### App.tsx - nowa trasa

```typescript
<Route path="/events/:slug" element={<PaidEventPage />} />
```

### Logika widoczności
- Strona dostępna publicznie dla opublikowanych wydarzeń
- Dla nieopublikowanych - tylko administratorzy
- Respektowanie ustawień visible_to_* z paid_events

---

## 5. Szczegóły implementacji UI

### Design zgodny z referencją

**Paleta kolorów (z screenów):**
- Tło główne: biały/jasny szary (#f5f5f5)
- Sekcja prelegentów: niebieski (#4a6fa5)
- Nagłówki: ciemnogranatowy (#1a365d)
- Akcenty: pomarańczowy (#e67e22) dla CTA
- Tekst: ciemnoszary (#333)

**Typografia:**
- Nagłówki sekcji: 28-32px, bold, serif-like
- Body text: 14-16px, system font
- Bullet lists: kolorowy tekst dla emphasis

**Layout:**
- Desktop: 2 kolumny (content 70% + sidebar 30%)
- Mobile: jedna kolumna, sidebar zamienia się w sticky footer

---

## 6. Migracja bazy danych

```sql
-- Sekcje treści dla wydarzeń
CREATE TABLE paid_event_content_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES paid_events(id) ON DELETE CASCADE,
  section_type text NOT NULL DEFAULT 'custom',
  title text NOT NULL,
  content text,
  position int DEFAULT 0,
  is_active boolean DEFAULT true,
  background_color text,
  text_color text,
  icon_name text,
  items jsonb, -- dla list typu "co zawiera"
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indeksy
CREATE INDEX idx_paid_event_content_sections_event ON paid_event_content_sections(event_id);

-- RLS
ALTER TABLE paid_event_content_sections ENABLE ROW LEVEL SECURITY;

-- Polityki (admini full access, publiczny read dla published)
CREATE POLICY "Public read content sections" ON paid_event_content_sections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM paid_events 
      WHERE id = event_id AND is_published = true AND is_active = true
    )
  );

CREATE POLICY "Admin full access content sections" ON paid_event_content_sections
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Rozszerzenie paid_event_tickets o listę benefitów
ALTER TABLE paid_event_tickets 
  ADD COLUMN benefits jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN highlight_text text,
  ADD COLUMN is_featured boolean DEFAULT false;
```

---

## 7. Kolejność implementacji

### Faza 1: Baza danych
1. Migracja SQL - tabela `paid_event_content_sections`
2. Rozszerzenie `paid_event_tickets` o benefits
3. Polityki RLS

### Faza 2: Strona publiczna
4. `PaidEventPage.tsx` - główny kontener
5. `PaidEventHero.tsx` - sekcja hero z banerem
6. `PaidEventNavigation.tsx` - nawigacja zakładkowa
7. Komponenty sekcji (About, Why, Schedule, Speakers)
8. `PaidEventSidebar.tsx` - pricing sticky
9. `PurchaseDrawer.tsx` - formularz zakupu

### Faza 3: Panel admina
10. `PaidEventContentEditor.tsx` - edytor sekcji CMS
11. `PaidEventSpeakersEditor.tsx` - zarządzanie prelegentami
12. `PaidEventScheduleEditor.tsx` - harmonogram
13. `PaidEventTicketsEditor.tsx` - rozszerzenie o benefits

### Faza 4: Integracja
14. Dodanie trasy w App.tsx
15. Aktualizacja link w PaidEventsList (kopiowanie URL)
16. Testy end-to-end flow zakupu

---

## 8. Struktura plików

```text
src/
├── pages/
│   └── PaidEventPage.tsx              # Nowa strona
├── components/
│   └── paid-events/
│       ├── public/
│       │   ├── PaidEventHero.tsx
│       │   ├── PaidEventNavigation.tsx
│       │   ├── PaidEventContent.tsx
│       │   ├── PaidEventSidebar.tsx
│       │   ├── PaidEventSpeakers.tsx
│       │   ├── PaidEventSchedule.tsx
│       │   ├── PaidEventSection.tsx
│       │   ├── TicketCard.tsx
│       │   └── PurchaseDrawer.tsx
│       └── admin/
│           ├── ContentSectionEditor.tsx
│           ├── SpeakersEditor.tsx
│           ├── ScheduleEditor.tsx
│           └── TicketBenefitsEditor.tsx
```

---

## Podsumowanie

Plan przewiduje:
- **1 nową tabelę** bazy danych dla sekcji treści CMS
- **1 rozszerzenie** istniejącej tabeli biletów
- **1 nową stronę** publiczną z pełnym layoutem
- **~12 nowych komponentów** UI dla strony publicznej i admina
- **Pełną edytowalność** wszystkich sekcji z poziomu panelu CMS
- **Responsywny design** dopasowany do stylu aplikacji
- **Integrację** z istniejącym flow płatności PayU
