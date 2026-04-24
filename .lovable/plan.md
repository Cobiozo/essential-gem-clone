## Co robimy

1. **Sidebar**: zmieniamy etykietę pozycji menu z „Eventy płatne" na „Eventy".
2. **Pure-Kontakty → Kontakty prywatne**: dodajemy nową zakładkę **„Z zaproszeń na Eventy"**, w której partner widzi gości zapisanych przez jego link partnerski do formularza rejestracyjnego płatnego eventu.

## Skąd biorą się te kontakty

Każde zgłoszenie wysłane z linku partnera (RPC `submit_event_form` → tabela `event_form_submissions` z `partner_user_id`) automatycznie tworzy wpis w `team_contacts` partnera z:
- `contact_type = 'guest'`
- `contact_source = 'event_invite'`
- `contact_reason = 'Zapisany przez Twój link na: <tytuł eventu>'`

Czyli źródło danych już istnieje — wystarczy je odfiltrować i pokazać w nowej pod-zakładce.

## Zmiany w kodzie

### 1. `src/components/dashboard/DashboardSidebar.tsx`
- Linia 144: `'dashboard.menu.paidEvents': 'Eventy płatne'` → `'Eventy'`.
- (Tooltip „Płatne szkolenia i wydarzenia z biletami" zostawiamy — to opis, nie nazwa.)

### 2. `src/components/team-contacts/TeamContactsTab.tsx`
- Rozszerzamy typ `privateSubTab` o wartość `'event-invites'`.
- Liczymy nową grupę:
  ```
  const paidEventInviteContacts = privateContacts.filter(
    c => c.contact_source === 'event_invite' && !(c as any).moved_to_own_list
  );
  ```
- W `ownContacts` dokładamy wykluczenie `c.contact_source === 'event_invite'` (analogicznie do „Strona partnerska"), żeby goście z eventów nie dublowali się na „Mojej liście kontaktów".
- W pasku pod-zakładek dodajemy nowy przycisk obok „Z zaproszeń na webinary ogólne":
  ```
  Z zaproszeń na Eventy  [N]
  ```
  z ikoną `Ticket` (już importowaną w projekcie).
- W bloku renderującym dodajemy gałąź: gdy `privateSubTab === 'event-invites'`, używamy istniejącego `TeamContactAccordion` (lub `TeamContactsTable` zależnie od `viewMode`) z `contacts={paidEventInviteContacts}`, bez grupowania po wydarzeniu (każdy wpis ma już w `contact_reason` tytuł eventu).

### 3. (opcjonalnie, jeśli zajdzie potrzeba) Brak — istniejące polityki RLS na `team_contacts` już zapewniają, że partner widzi tylko swoje wpisy (`user_id = auth.uid()`).

## Pliki

**Edytowane (2):**
- `src/components/dashboard/DashboardSidebar.tsx` — zmiana etykiety.
- `src/components/team-contacts/TeamContactsTab.tsx` — nowy sub-tab „Z zaproszeń na Eventy".

Brak migracji DB ani nowych komponentów — używamy istniejących list (`TeamContactAccordion` / `TeamContactsTable`).

Po Twojej akceptacji wprowadzam zmiany.