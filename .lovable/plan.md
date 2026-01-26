
# Plan: Panel statystyk rejestracji użytkowników na wydarzenia

## Analiza obecnego stanu

### Co już istnieje:
1. **Tabela `event_registrations`** - przechowuje wszystkie zapisy zalogowanych użytkowników
2. **Tabela `guest_event_registrations`** - dla gości zewnętrznych (webinary)
3. **Komponent `GuestRegistrationsManagement`** - zarządza gośćmi (niezalogowanymi)
4. **Zakładka "Zarządzanie wydarzeniami"** (`events`) - tworzenie/edycja wydarzeń

### Czego brakuje:
Panel do przeglądania **kto z zalogowanych użytkowników** zapisał się na wydarzenia wewnętrzne.

---

## Propozycja rozwiązania

Stworzę nowy komponent `EventRegistrationsManagement` wzorowany na `GuestRegistrationsManagement`, ale pobierający dane z tabeli `event_registrations` z dołączonymi profilami użytkowników.

### Lokalizacja w panelu admina:

```text
Panel Admina
├── Funkcjonalności
│   ├── ...
│   ├── Zarządzanie wydarzeniami  (istniejące)
│   ├── Rejestracje gości          (istniejące - dla webinarów)
│   ├── Rejestracje użytkowników   ← NOWY KOMPONENT
│   ├── ...
```

Zakładka pojawi się tuż pod "Rejestracje gości" jako logiczne uzupełnienie.

---

## Funkcjonalności nowego panelu

| Funkcja | Opis |
|---------|------|
| Wybór wydarzenia | Dropdown z listą wydarzeń (wszystkie typy lub filtr po typie) |
| Tabela zapisów | Imię, nazwisko, email, rola, status, data zapisu, occurrence_index |
| Statystyki | Łączna liczba zapisów, aktywnych, anulowanych |
| Eksport CSV | Pobierz listę do arkusza |
| Filtrowanie | Po typie wydarzenia, statusie, dacie |

### Widok tabeli:

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Rejestracje użytkowników na wydarzenia                                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Wydarzenie: [Pure Calling ▼]  Typ: [Wszystkie ▼]     [Eksport CSV]              │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Statystyki:  Wszystkich: 45   Aktywnych: 38   Anulowanych: 7                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Imię i nazwisko    │ Email                  │ Rola     │ Status  │ Data zapisu  │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Sebastian Snopek   │ sebastian@...          │ partner  │ ✓ Zapisany │ 26.01 19:35 │
│ Marcin Kipa        │ marcin@...             │ partner  │ ✓ Zapisany │ 26.01 19:29 │
│ Urszula Gałażyn    │ urszula@...            │ klient   │ ✗ Anulowany│ 25.01 14:00 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Sekcja techniczna

### 1. Nowy plik: `src/components/admin/EventRegistrationsManagement.tsx`

Struktura komponentu:

```typescript
interface EventRegistration {
  id: string;
  event_id: string;
  user_id: string;
  status: string;
  registered_at: string;
  cancelled_at: string | null;
  occurrence_index: number | null;
  // Dołączone z profiles
  user_profile: {
    first_name: string | null;
    last_name: string | null;
    email: string;
    role: string;
  };
  // Dołączone z events
  event: {
    title: string;
    event_type: string;
    start_time: string;
    occurrences: any;
  };
}
```

**Zapytanie do bazy:**
```typescript
const { data } = await supabase
  .from('event_registrations')
  .select(`
    id,
    event_id,
    user_id,
    status,
    registered_at,
    cancelled_at,
    occurrence_index,
    profiles!inner(first_name, last_name, email, role),
    events!inner(title, event_type, start_time, occurrences)
  `)
  .eq('event_id', selectedEventId)
  .order('registered_at', { ascending: false });
```

**Funkcje:**
- `fetchEvents()` - lista wydarzeń do wyboru
- `fetchRegistrations()` - rejestracje dla wybranego wydarzenia  
- `handleExportCSV()` - eksport do CSV
- `getOccurrenceDate()` - oblicz rzeczywistą datę dla spotkań cyklicznych

---

### 2. Zmiana w `src/components/admin/AdminSidebar.tsx`

Dodanie nowego elementu menu w kategorii "features" (linia ~185):

```typescript
// Istniejące:
{ value: 'guest-registrations', labelKey: 'guestRegistrations', icon: UserPlus },
// Nowe:
{ value: 'event-registrations', labelKey: 'eventRegistrations', icon: Users },
```

Dodanie klucza tłumaczenia:
```typescript
eventRegistrations: 'admin.sidebar.eventRegistrations',
```

I hardcoded label:
```typescript
eventRegistrations: 'Rejestracje użytkowników',
```

---

### 3. Zmiana w `src/pages/Admin.tsx`

**Import (linia ~60):**
```typescript
import EventRegistrationsManagement from '@/components/admin/EventRegistrationsManagement';
```

**TabsContent (po linii 4357):**
```typescript
<TabsContent value="event-registrations">
  <EventRegistrationsManagement />
</TabsContent>
```

---

## Podsumowanie zmian

| Plik | Zmiana | Cel |
|------|--------|-----|
| `EventRegistrationsManagement.tsx` | Nowy komponent | Panel statystyk rejestracji |
| `AdminSidebar.tsx` | Nowy element menu | Dostęp z sidebara |
| `Admin.tsx` | Import + TabsContent | Renderowanie zakładki |

---

## Dodatkowe opcje (opcjonalne rozszerzenia)

1. **Filtrowanie po typie wydarzenia** - dropdown: Team Training, Webinar, Konsultacje, etc.
2. **Widok zbiorczy** - wszystkie wydarzenia naraz z grupowaniem
3. **Widok dla konkretnego terminu** - dla spotkań cyklicznych pokazuj occurrence_index
4. **Historia zmian** - kto anulował i kiedy

---

## Efekt końcowy

- Admin widzi **kto zapisał się** na każde wydarzenie
- Może **eksportować dane** do CSV
- Widzi **statystyki** zapisów
- Panel jest **tylko dla admina** (w panelu /admin)
- **Zero zmian** w logice zapisów - tylko nowy widok danych
