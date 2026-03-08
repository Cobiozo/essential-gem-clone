

# Plan: Grupowanie kontaktów wg wydarzeń + wykrywanie duplikatów

## Obecny stan
Sub-tab "Z zaproszeń na wydarzenia" pokazuje płaską listę kontaktów z badge'ami wydarzeń. Brak grupowania i wykrywania duplikatów.

## Zmiany

### 1. Nowy komponent `EventGroupedContacts.tsx`
Widok grupujący kontakty według wydarzeń:
- Każde wydarzenie jako sekcja z nagłówkiem (tytuł + data + liczba gości)
- Pod spodem lista kontaktów zapisanych na to wydarzenie
- Collapsible sections (rozwijane/zwijane)

### 2. Wykrywanie duplikatów
W hooku `useTeamContacts.ts` — po pobraniu `eventContactDetails`, zbudować mapę duplikatów:
- Klucz: `email` lub `phone_number` (normalizowane)
- Wartość: lista event_id + contact_id gdzie ta osoba się pojawiła
- Jeśli osoba jest w >1 wydarzeniu → oznaczenie badge "Zapisany na X wydarzeń"

### 3. Struktura danych
Rozszerzyć `useTeamContacts` o:
```typescript
// Mapa: event_id → { event_title, event_date, contacts: TeamContact[] }
eventGroupedContacts: Map<string, { title: string; date: string; contacts: TeamContact[] }>

// Mapa: contact email/phone → number of events
duplicateContactEvents: Map<string, number>
```

### 4. UI w `TeamContactsTab.tsx`
W sub-tabie "Z zaproszeń na wydarzenia" zamienić flat list na `EventGroupedContacts`:
- Nagłówek wydarzenia z datą i liczbą zapisanych
- Kontakty pod każdym wydarzeniem z akcjami (edycja, usuwanie, historia)
- Badge "🔄 Zapisany na X wydarzeń" przy kontaktach pojawiających się wielokrotnie
- Zachować istniejące tryby widoku (accordion/table)

### Pliki do edycji:
1. `src/hooks/useTeamContacts.ts` — dodać `eventGroupedContacts` i `duplicateContactEvents`
2. `src/components/team-contacts/EventGroupedContacts.tsx` — nowy komponent
3. `src/components/team-contacts/TeamContactsTab.tsx` — użyć nowego komponentu w sub-tabie events
4. `src/components/team-contacts/types.ts` — dodać typ `EventGroup`

