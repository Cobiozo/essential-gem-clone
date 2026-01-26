

# Plan: Połączenie rejestrów gości i użytkowników w jeden panel

## Analiza obecnego stanu

### Dwa osobne panele:
| Panel | Tabela | Kto się zapisuje | Na jakie wydarzenia |
|-------|--------|------------------|---------------------|
| `GuestRegistrationsManagement` | `guest_event_registrations` | Goście (niezalogowani) | Webinary, team_training (gdzie `allow_invites = true`) |
| `EventRegistrationsManagement` | `event_registrations` | Zalogowani użytkownicy | Wszystkie wydarzenia wewnętrzne |

### Propozycja użytkownika:
- **Jeden wspólny panel** z dwoma zakładkami/sekcjami
- **Goście** - pokazuj tylko dla wydarzeń z `allow_invites = true`
- **Użytkownicy** - wszystkie wydarzenia (webinary, spotkania zespołu)

---

## Rozwiązanie: Połączony panel z zakładkami

### Nowy widok po połączeniu:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 📋 Rejestracje na wydarzenia                                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Wydarzenie: [Pure Calling ▼]                                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   [👥 Użytkownicy (12)]    [👤 Goście (5)]    ← zakładki                       │
│   ━━━━━━━━━━━━━━━━━━━━━                                                         │
│                                                                                  │
│   Statystyki:  Wszystkich: 12   Aktywnych: 10   Anulowanych: 2                 │
│                                                                                  │
│   ┌────────────────────────────────────────────────────────────────────────────┐│
│   │ Imię i nazwisko │ Email            │ Rola    │ Status  │ Termin  │ Data   ││
│   ├────────────────────────────────────────────────────────────────────────────┤│
│   │ Sebastian S.    │ seb@...          │ Partner │ ✓       │ 27.01   │ 26.01  ││
│   │ Marcin K.       │ mar@...          │ Partner │ ✓       │ 27.01   │ 26.01  ││
│   └────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
│   [📥 Eksport CSV]                                                              │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Logika wyświetlania zakładki "Goście":
- Zakładka "Goście" pojawia się **tylko** gdy wybrane wydarzenie ma `allow_invites = true`
- Jeśli wydarzenie nie pozwala na gości → tylko zakładka "Użytkownicy"

---

## Sekcja techniczna

### 1. Modyfikacja pliku: `src/components/admin/EventRegistrationsManagement.tsx`

**Zmiany:**

1. **Dodanie zakładek (Tabs)** do przełączania między użytkownikami a gośćmi
2. **Rozszerzenie interfejsu `EventOption`** o pole `allow_invites: boolean`
3. **Nowy stan `guestRegistrations`** do przechowywania gości
4. **Funkcja `fetchGuestRegistrations()`** - pobieranie z `guest_event_registrations`
5. **Warunkowe wyświetlanie zakładki "Goście"** - tylko gdy `selectedEvent?.allow_invites === true`
6. **Osobna tabela dla gości** z dodatkowymi kolumnami (telefon, zaproszony przez, powiadomienia)
7. **Funkcje zarządzania gośćmi** (zmiana statusu, wysyłanie przypomnień) - przeniesione z `GuestRegistrationsManagement`

**Nowa struktura komponentu:**

```typescript
// Rozszerzony EventOption
interface EventOption {
  id: string;
  title: string;
  event_type: string;
  start_time: string;
  occurrences: any;
  allow_invites: boolean;  // ← NOWE
}

// Interfejs dla gości (z GuestRegistrationsManagement)
interface GuestRegistration {
  id: string;
  event_id: string;
  email: string;
  first_name: string;
  last_name: string | null;
  phone: string | null;
  status: string;
  registered_at: string;
  confirmation_sent: boolean;
  reminder_sent: boolean;
  invited_by_user_id: string | null;
  inviter_profile?: { first_name: string | null; last_name: string | null; } | null;
}

// Nowy stan
const [activeTab, setActiveTab] = useState<'users' | 'guests'>('users');
const [guestRegistrations, setGuestRegistrations] = useState<GuestRegistration[]>([]);
```

**Zapytanie o wydarzenia z `allow_invites`:**

```typescript
const { data, error } = await supabase
  .from('events')
  .select('id, title, event_type, start_time, occurrences, allow_invites')
  .eq('is_active', true)
  .in('event_type', ['webinar', 'team_training'])  // Wydarzenia z zapisami
  .order('start_time', { ascending: false });
```

**Warunkowe zakładki:**

```typescript
<Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'users' | 'guests')}>
  <TabsList>
    <TabsTrigger value="users">
      <Users className="h-4 w-4 mr-2" />
      Użytkownicy ({userRegistrations.length})
    </TabsTrigger>
    
    {/* Zakładka gości tylko gdy allow_invites = true */}
    {selectedEvent?.allow_invites && (
      <TabsTrigger value="guests">
        <UserPlus className="h-4 w-4 mr-2" />
        Goście ({guestRegistrations.length})
      </TabsTrigger>
    )}
  </TabsList>
  
  <TabsContent value="users">
    {/* Tabela użytkowników - obecna logika */}
  </TabsContent>
  
  <TabsContent value="guests">
    {/* Tabela gości - logika z GuestRegistrationsManagement */}
  </TabsContent>
</Tabs>
```

---

### 2. Usunięcie z AdminSidebar.tsx

Usunięcie osobnej pozycji `guest-registrations` z menu:

```diff
  { value: 'events', labelKey: 'events', icon: CalendarDays },
- { value: 'guest-registrations', labelKey: 'guestRegistrations', icon: UserPlus },
  { value: 'event-registrations', labelKey: 'eventRegistrations', icon: Users },
```

---

### 3. Zmiana nazwy w sidebar

Zmiana etykiety z "Rejestracje użytkowników" na bardziej ogólną:

```typescript
eventRegistrations: 'Rejestracje na wydarzenia',
```

---

### 4. Usunięcie z Admin.tsx

Usunięcie `TabsContent` dla `guest-registrations` (będzie częścią `event-registrations`):

```diff
- <TabsContent value="guest-registrations">
-   <GuestRegistrationsManagement />
- </TabsContent>
```

---

### 5. Opcjonalne: Usunięcie pliku

Plik `GuestRegistrationsManagement.tsx` można usunąć lub zachować jako backup - cała jego logika zostanie przeniesiona do `EventRegistrationsManagement.tsx`.

---

## Podsumowanie zmian

| Plik | Zmiana |
|------|--------|
| `EventRegistrationsManagement.tsx` | Dodanie zakładek, integracja logiki gości |
| `AdminSidebar.tsx` | Usunięcie `guest-registrations`, zmiana nazwy |
| `Admin.tsx` | Usunięcie `TabsContent` dla `guest-registrations` |
| `GuestRegistrationsManagement.tsx` | Do usunięcia (opcjonalnie) |

---

## Efekt końcowy

- **Jeden panel** zamiast dwóch
- **Wszystkie wydarzenia** (webinary + spotkania zespołu) w jednym dropdown
- **Zakładka "Goście"** pojawia się automatycznie gdy wydarzenie ma włączone zaproszenia
- **Spójne UI** - statystyki, eksport CSV dla obu typów
- **Mniej pozycji w menu** - łatwiejsza nawigacja dla admina

