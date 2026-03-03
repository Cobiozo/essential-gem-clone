
# Zmiany w kontaktach prywatnych

## 1. Zmiana nazwy "Własna lista" → "Moja lista kontaktów"
**Plik**: `src/components/team-contacts/TeamContactsTab.tsx` (linia 322)

## 2. Ukrycie ikony rejestracji na spotkania w zakładce "Moja lista kontaktów"
Dodać prop `hideEventInfo?: boolean` do `TeamContactAccordion` i `TeamContactsTable`. Przekazywać `hideEventInfo={privateSubTab === 'own'}` przy renderowaniu kontaktów prywatnych. W obu komponentach warunkowo ukryć `<ContactEventInfoButton>` gdy `hideEventInfo === true`.

**Pliki do zmiany**:
- `src/components/team-contacts/TeamContactsTab.tsx` — nazwa + nowy prop
- `src/components/team-contacts/TeamContactAccordion.tsx` — obsługa `hideEventInfo`
- `src/components/team-contacts/TeamContactsTable.tsx` — obsługa `hideEventInfo`
