
# Plan zmian — 5 zadań jednocześnie

## Diagnoza wszystkich problemów

### 1. Sidebar — reorganizacja kolejności i widoczności

Aktualny układ (linie 391–490 `DashboardSidebar.tsx`):
```
Pulpit → Akademia → Zdrowa Wiedza → Biblioteka → Pure-Kontakty
→ Aktualności → Eventy → Eventy płatne
→ [Panel Lidera - warunkowo, tylko gdy tripartite lub consultation]
→ Czat → Wsparcie i pomoc → PureLinki → InfoLinki → Społeczność
→ [HTML pages] → Ustawienia → Kalkulator → CMS Panel
```

Żądany układ:
```
Pulpit
→ [Panel Lidera - TUTAJ, pod Pulpitem]
Akademia → Zdrowa Wiedza → Biblioteka → Pure-Kontakty
→ Aktualności → Eventy → Eventy płatne
→ Czat → PureLinki → InfoLinki
→ [HTML pages] → Ustawienia
→ Wsparcie i pomoc [poniżej Ustawień]
→ Kalkulator [bez zmian w treści, ale kalkulator w Panel Lidera też]
→ CMS Panel
```

- **Społeczność** — ukryć całkowicie z menu (ikony w stopce pełnią tę samą rolę). Zmiana: usunąć element `community` z tablicy `menuItems` LUB zawsze zwracać `false` w filtrze widoczności dla `community`.
- **Panel Lidera** — przenieść bezpośrednio za `dashboard` w tablicy `menuItems`.
- **Wsparcie i pomoc** — przenieść po `settings` w tablicy `menuItems`.
- **Kalkulator dla Specjalistów + Influenserów w Panel Lidera** — Panel Lidera ma teraz być osobną sekcją z submenu zawierającym kalkulatory PLUS dotychczasowe linki do `/leader` i ewentualnie spotkań.

**Uwaga dot. warunku widoczności Panel Lidera**: Aktualnie Panel Lidera pojawia się tylko gdy `individualMeetingsEnabled.tripartite || individualMeetingsEnabled.consultation`. Należy poszerzyć ten warunek — jeżeli partner ma dostęp do kalkulatora (`calculatorAccess?.hasAccess`), Panel Lidera też powinien być widoczny.

**Nowa struktura Panel Lidera** jako item z submenu:
```
Panel Lidera (Crown icon)
  ├── Panel Lidera [główny] → /leader
  ├── Kalkulator Influenserów → /calculator/influencer  (gdy hasAccess)
  └── Kalkulator Specjalistów → /calculator/specialist  (gdy hasAccess)
```

Kalkulator jako osobny element sidebara pozostaje (dla adminów), ale dla partnerów kalkulatory trafiają do Panel Lidera submenu.

### 2. Błąd "Nie udało się dodać kontaktu" — constraint mismatch

**Potwierdzone przez logi PostgreSQL**:
```
ERROR: new row for relation "team_contacts" violates check constraint 
"team_contacts_relationship_status_check"
```

Constraint w bazie dopuszcza TYLKO: `active`, `suspended`, `closed_success`, `closed_not_now`

Formularz `PrivateContactForm.tsx` wysyła m.in.: `observation`, `potential_partner`, `potential_specialist` — KTÓRYCH NIE MA W CONSTRAINT!

**Dwa możliwe rozwiązania**:
- Opcja A: Zmienić constraint w bazie (migracja SQL) — dodać brakujące wartości
- Opcja B: Zmienić formularz — mapować wartości do tych obsługiwanych przez bazę

**Wybrane rozwiązanie: Opcja A (migracja)** — bo opcje w formularzu mają sens biznesowy i nie należy ich redukować. Nowa migracja SQL:
```sql
ALTER TABLE team_contacts 
DROP CONSTRAINT team_contacts_relationship_status_check;

ALTER TABLE team_contacts 
ADD CONSTRAINT team_contacts_relationship_status_check 
CHECK (relationship_status = ANY (ARRAY[
  'active', 'suspended', 'closed_success', 'closed_not_now',
  'observation', 'potential_partner', 'potential_specialist'
]));
```

### 3. "Moja strona" — alias = EQ ID użytkownika (automatyczny)

Aktualnie w `PartnerPageEditor.tsx`:
- `alias` to pole tekstowe, które użytkownik wpisuje ręcznie
- `handleAliasChange` normalizuje i waliduje alias

Nowe zachowanie:
- Przy ładowaniu komponentu, jeśli brak aliasu → automatycznie pobierz `eq_id` z profilu użytkownika i ustaw jako alias
- Jeśli alias już istnieje (partner wcześniej go ustawił) → zostawić bez zmian (migracja danych)
- Pole `alias` zmienić na **tylko do odczytu** — wyświetlić informacyjnie (nie jako edytowalny input)
- Ukryć przycisk ręcznej edycji aliasu; alias = zawsze EQ ID
- Przy pierwszym zapisie `savePartnerPage` automatycznie przekazać alias = EQ ID z profilu
- W `usePartnerPage.ts` lub `PartnerPageEditor.tsx` dodać logikę: podczas `fetchData` pobierz też `eq_id` z profilu i jeśli `partnerPage?.alias` jest puste, wywołaj `savePartnerPage({ alias: eqId })` automatycznie

**Implementacja w `PartnerPageEditor.tsx`**:
1. Dodać `useAuth` żeby mieć `user`
2. Dodać dodatkowy query: `supabase.from('profiles').select('eq_id').eq('user_id', user.id).single()`
3. W `useEffect` po załadowaniu `partnerPage`: jeśli `!partnerPage?.alias` i `eqId` — automatycznie zapisać alias
4. Usunąć edytowalny `Input` dla aliasu; zastąpić statycznym wyświetleniem
5. Upewnić się, że alias nie jest wysyłany jako edytowalny przez użytkownika przy każdym `handleSave`

## Pliki do zmiany

| Plik | Co się zmienia |
|------|----------------|
| `src/components/dashboard/DashboardSidebar.tsx` | Reorganizacja kolejności menu, ukrycie Społeczności, Panel Lidera z submenu kalkulatorów, Wsparcie po Ustawieniach |
| `src/components/team-contacts/PrivateContactForm.tsx` | Brak zmian w kodzie — fix przez migrację SQL |
| `src/components/partner-page/PartnerPageEditor.tsx` | Alias automatycznie z EQ ID, pole tylko do odczytu |
| `supabase/migrations/[nowa].sql` | Rozszerzenie constraint `relationship_status` o brakujące wartości |

## Szczegóły — reorganizacja tablicy menuItems

Nowa kolejność w tablicy `menuItems` (linia ~391):
```
1. dashboard (Pulpit)
2. leader-panel — PRZENIESIONY TUTAJ (z submenu: /leader, /calculator/influencer, /calculator/specialist)
3. academy
4. healthy-knowledge
5. resources
6. pureContacts
7. news
8. events
9. paid-events
10. chat
11. reflinks
12. infolinks
13. [community — USUNIĘTY z menu, zostaje tylko w stopce]
14. [HTML pages]
15. settings
16. support — PRZENIESIONY PO settings
17. calculator — zostaje dla adminów (ale dla partnerów kalkulatory są w Panel Lidera)
18. admin
```

## Warunek widoczności Panel Lidera (nowy)

```typescript
const showLeaderPanel = isPartner && (
  individualMeetingsEnabled.tripartite || 
  individualMeetingsEnabled.consultation ||
  calculatorAccess?.hasAccess // NOWE — kalkulator też daje dostęp do panelu
);
```

Submenu Panel Lidera:
```typescript
submenuItems: [
  { id: 'leader-main', labelKey: 'Panel Lidera', path: '/leader', icon: Crown },
  ...(calculatorAccess?.hasAccess ? [
    { id: 'calc-influencer', labelKey: 'Kalkulator Influenserów', path: '/calculator/influencer', icon: Users },
    { id: 'calc-specialist', labelKey: 'Kalkulator Specjalistów', path: '/calculator/specialist', icon: UserRound },
  ] : []),
]
```

## Kwestia constraint SQL

Sprawdzone dane z logów:
- 4 błędy `team_contacts_relationship_status_check` — wszystkie z niedozwolonymi wartościami
- Constraint obecny: `active | suspended | closed_success | closed_not_now`
- Brakuje: `observation | potential_partner | potential_specialist`

Migracja jest bezpieczna — tylko rozszerzamy listę dozwolonych wartości, nie usuwamy istniejących.
