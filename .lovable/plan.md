

# Naprawa logiki badge'a "Zapisany na X wydarzeń"

## Problem
Obecna logika `buildEventGroups` w `useTeamContacts.ts` wykrywa "duplikaty" przez dopasowanie email/telefon **między różnymi kontaktami** (różne `contact.id`). To powoduje fałszywe badge'e — np. Roman Snopkowski i Roman Madalinski mają ten sam email, więc obaj dostają badge "Zapisany na 2 wydarzeń", mimo że każdy jest zapisany tylko na 1.

## Oczekiwane zachowanie
- Badge "Zapisany na X wydarzeń" powinien liczyć ile wydarzeń ma **ten konkretny kontakt** (po `contact.id`) w `eventContactDetails`
- Nie krzyżować danych między różnymi kontaktami po email/telefon

## Zmiana

**Plik:** `src/hooks/useTeamContacts.ts` — funkcja `buildEventGroups`

Usunąć całą logikę `contactEventMap` (dopasowanie email/phone cross-contact) i zastąpić prostym zliczeniem:

```typescript
// Per-contact event count — simply count registrations for each contact ID
for (const [contactId, registrations] of eventContactDetails.entries()) {
  if (registrations.length > 1) {
    duplicates.set(contactId, registrations.length);
  }
}
```

Usunięte zostanie ~20 linii kodu duplikacji opartego na email/phone, zastąpione ~3 liniami.

Jedna zmiana w jednym pliku.

