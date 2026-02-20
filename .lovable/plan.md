
# Przebudowa Panel Lidera — Unified Hub + Admin CMS

## Wizja końcowa (wg opisu użytkownika)

Panel Lidera staje się jednym centralnym miejscem, gdzie lider widzi TYLKO te moduły, które admin mu przydzielił:

```text
/leader
├── [Spotkania indywidualne] — gdy individual_meetings_enabled
├── [Szkolenia zespołu]       — gdy can_view_team_progress  
├── [Kalkulator Influencerów] — gdy calculator_user_access.has_access
├── [Kalkulator Specjalistów] — gdy specialist_calculator_user_access.has_access
└── [Moja struktura]          — gdy can_view_org_tree (nowa flaga)
```

Admin w CMS ma dedykowaną sekcję "Panel Lidera" — wyszukuje użytkownika i włącza mu poszczególne opcje przełącznikami.

---

## Diagnoza stanu obecnego

### Co istnieje i działa poprawnie:
- `leader_permissions` tabela — zawiera już: `individual_meetings_enabled`, `tripartite_meeting_enabled`, `partner_consultation_enabled`, `can_broadcast`, `can_view_team_progress`
- `UnifiedMeetingSettingsForm` — gotowy komponent spotkań dla lidera
- `TeamTrainingProgressView` — gotowy komponent szkoleń
- `CommissionCalculatorPage` (`/calculator/influencer`) — osobna strona z własną ochroną
- `SpecialistCalculatorPage` (`/calculator/specialist`) — osobna strona z własną ochroną
- Drzewo organizacyjne — `useOrganizationTree` + `OrganizationChart` — gotowe komponenty w `TeamContactsTab`
- `IndividualMeetingsManagement` — admin może włączać spotkania i szkolenia dla partnerów
- `CalculatorManagement` / `SpecialistCalculatorManagement` — admin może włączać kalkulatory

### Problemy do rozwiązania:

1. **`/leader` odrzuca użytkowników bez `can_host_private_meetings`** — hook `useLeaderAvailability` sprawdza `can_host_private_meetings` jako warunek `isLeader`. Lider z samymi kalkulatorami lub drzewem org zostanie wyrzucony z /leader.

2. **Brak zakładki "Moja struktura" w Panelu Lidera** — drzewo org jest w `TeamContactsTab` w `/my-account`, nie w Panel Lidera.

3. **Brak flagi `can_view_org_tree` w `leader_permissions`** — potrzebna nowa kolumna lub osobne podejście.

4. **Kalkulatory w sidebarze** — zmiana planu: sidebar ma jeden link "Panel Lidera" → `/leader` bez submenu kalkulatorów. Kalkulatory jako zakładki WEWNĄTRZ `/leader`.

5. **CMS: brak spójnego "Panel Lidera" miejsca** — uprawnienia spotkań są w jednym miejscu, kalkulatory w innym. Admin musi skakać po zakładkach.

6. **Sidebar: `showLeaderPanel` nadal bazuje na spotkaniach + calculatorAccess (influencer only)** — nie uwzględnia specjalist calculator ani nowej flagi org tree.

---

## Plan techniczny

### Krok 1: Migracja bazy danych

Dodanie kolumny `can_view_org_tree` do tabeli `leader_permissions`:

```sql
ALTER TABLE leader_permissions 
ADD COLUMN IF NOT EXISTS can_view_org_tree boolean DEFAULT false;
```

To jedyna zmiana schematu. Kalkulator nie wymaga osobnej flagi w `leader_permissions` — ma własne tabele (`calculator_user_access`, `specialist_calculator_user_access`).

### Krok 2: Refaktor `useLeaderAvailability` → nowy hook `useLeaderPermissions`

Obecny `useLeaderAvailability` ma `isLeader = can_host_private_meetings` — zbyt wąsko.

Nowy hook (lub rozszerzenie istniejącego) będzie zwracał:

```typescript
{
  // Flagi dostępu do modułów
  hasMeetings: boolean,             // individual_meetings_enabled
  hasTeamProgress: boolean,         // can_view_team_progress  
  hasInfluencerCalc: boolean,       // z calculator_user_access
  hasSpecialistCalc: boolean,       // z specialist_calculator_user_access
  hasOrgTree: boolean,              // can_view_org_tree
  
  // Czy w ogóle ma cokolwiek (czy pokazać Panel Lidera w sidebarze)
  isAnyLeaderFeatureEnabled: boolean,
  
  // Pozostałe dane dla komponentu spotkań
  leaderPermission: LeaderPermission | null,
  loading: boolean,
}
```

Hook pobiera dane równolegle z 3 źródeł:
- `leader_permissions` (spotkania + org tree)
- `calculator_user_access` (influencer)
- `specialist_calculator_user_access` (specialist)

### Krok 3: Refaktor `LeaderPanel.tsx`

Całkowita przebudowa logiki dostępu i zakładek:

```typescript
// Warunek "czy masz dostęp do Panel Lidera"
if (!isAnyLeaderFeatureEnabled) → redirect do /dashboard

// Zakładki budowane dynamicznie:
const availableTabs = [
  ...(hasMeetings        ? [{ id: 'meetings',    label: 'Spotkania indywidualne', icon: CalendarDays }] : []),
  ...(hasTeamProgress    ? [{ id: 'training',    label: 'Szkolenia zespołu',      icon: GraduationCap }] : []),
  ...(hasInfluencerCalc  ? [{ id: 'calc-inf',   label: 'Kalkulator Influencerów',icon: Calculator }] : []),
  ...(hasSpecialistCalc  ? [{ id: 'calc-spec',  label: 'Kalkulator Specjalistów', icon: UserRound }] : []),
  ...(hasOrgTree         ? [{ id: 'org-tree',   label: 'Moja struktura',          icon: TreePine }] : []),
]
```

Zawartość zakładek:
- `meetings` → `<UnifiedMeetingSettingsForm />` (istniejący)
- `training` → `<TeamTrainingProgressView />` (istniejący)
- `calc-inf` → importować i osadzić `<CommissionCalculator />` (z `@/components/calculator`)
- `calc-spec` → importować i osadzić `<SpecialistCalculator />` (z `@/components/specialist-calculator`)
- `org-tree` → nowy wrapper `<LeaderOrgTreeView />` (oparty na `useOrganizationTree` + `OrganizationChart`)

### Krok 4: Nowy komponent `LeaderOrgTreeView`

Prosty wrapper renderujący drzewo organizacyjne lidera — taki sam jak w `TeamContactsTab`, ale bez zarządzania kontaktami (tylko podgląd):

```typescript
// src/components/leader/LeaderOrgTreeView.tsx
const LeaderOrgTreeView = () => {
  const { tree, upline, statistics, settings, loading, error } = useOrganizationTree();
  // Renderuje: statystyki + OrganizationChart
  // Brak przycisków dodawania/edycji kontaktów
}
```

### Krok 5: Refaktor `DashboardSidebar.tsx`

**Uproszczenie** — Panel Lidera to **jeden link** bez submenu:

```typescript
// Pobieramy nowe flagi z nowego hooka
const { isAnyLeaderFeatureEnabled } = useLeaderPermissions();

// Sidebar item:
...(isAnyLeaderFeatureEnabled ? [{
  id: 'leader-panel',
  icon: Crown,
  labelKey: 'Panel Lidera',
  path: '/leader',  // Bezpośredni link, bez submenu
}] : [])
```

Usunięcie poprzedniego submenu z kalkulatorami. Kalkulatory są teraz WEWNĄTRZ `/leader`.

Aktualizacja warunku widoczności — hook pobierany na poziomie sidebara zastępuje dotychczasowe 3 oddzielne zapytania.

### Krok 6: Nowy komponent `LeaderPanelManagement` w CMS

Nowy komponent admina — "Panel Lidera" w CMS z:
- Wyszukiwarką użytkowników (wszyscy partnerzy)
- Kolumną statusu dla każdego uprawnienia
- Przełącznikami: Spotkania trójstronne, Konsultacje partnerskie, Szkolenia zespołu, Kalkulator Influenserów, Kalkulator Specjalistów, Moja struktura

Uprawnienia kalkulatorów (włączanie) wymagają jednoczesnego zapisu do:
- `leader_permissions` (na potrzeby spójności i flagi can_view_org_tree)
- `calculator_user_access` lub `specialist_calculator_user_access` (faktyczna kontrola dostępu)

W osobnej sekcji tabelarycznej — widok per użytkownik, jeden wiersz = jeden partner, z ikoną Crown przy tych którzy mają cokolwiek włączone.

### Krok 7: Integracja nowego CMS do panelu Admin

Dodanie nowej zakładki/pozycji "Panel Lidera" w `AdminSidebar.tsx` w kategorii "Użytkownicy" lub jako osobna sekcja w grupie "Funkcje", zastępując dotychczasowe fragmentaryczne zarządzanie.

---

## Schemat zmian

```text
NOWE / ZMIENIONE PLIKI:

supabase/migrations/xxx.sql
  └── ALTER TABLE leader_permissions ADD COLUMN can_view_org_tree

src/hooks/useLeaderPermissions.ts   [NOWY]
  └── Hook agregujący wszystkie flagi dostępu lidera

src/components/leader/LeaderOrgTreeView.tsx   [NOWY]
  └── Podgląd drzewa organizacyjnego w Panelu Lidera

src/components/admin/LeaderPanelManagement.tsx   [NOWY]
  └── CMS do zarządzania uprawnieniami Panelu Lidera

src/pages/LeaderPanel.tsx   [ZMODYFIKOWANY]
  └── Zakładki: meetings, training, calc-inf, calc-spec, org-tree

src/components/dashboard/DashboardSidebar.tsx   [ZMODYFIKOWANY]
  └── Panel Lidera = jeden link do /leader (bez submenu)
  └── Używa useLeaderPermissions zamiast 3 osobnych zapytań

src/pages/Admin.tsx   [ZMODYFIKOWANY]
  └── Nowa zakładka "leader-panel" renderująca LeaderPanelManagement

src/components/admin/AdminSidebar.tsx   [ZMODYFIKOWANY]
  └── Dodanie pozycji "Panel Lidera" w menu CMS
```

---

## Logika włączania kalkulatorów przez admina

Gdy admin włącza "Kalkulator Influenserów" dla partnera X w `LeaderPanelManagement`:

1. Sprawdza czy rekord w `calculator_user_access` dla user_id X istnieje
2. Jeśli nie — `INSERT { user_id: X, has_access: true }`
3. Jeśli tak — `UPDATE SET has_access = true`

Gdy wyłącza — `UPDATE SET has_access = false`

Analogicznie dla specjalist calculator → `specialist_calculator_user_access`.

Dla `can_view_org_tree` — zapis do `leader_permissions`.

---

## Warunek dostępu do /leader (nowa logika)

```typescript
isAnyLeaderFeatureEnabled = 
  hasMeetings ||
  hasTeamProgress ||
  hasInfluencerCalc ||
  hasSpecialistCalc ||
  hasOrgTree
```

Jeśli `false` → redirect do `/dashboard` z komunikatem.

---

## Podsumowanie zmian widocznych dla użytkownika

**Lider (Partner z uprawnieniami)**:
- Sidebar: jeden przycisk "Panel Lidera" → `/leader`
- Na `/leader`: widzi tylko zakładki które ma włączone
- Kalkulatory dostępne wewnątrz `/leader` jako zakładki (nie jako osobne linki w sidebarze)
- Zakładka "Moja struktura" — nowy widok drzewa org od siebie w dół

**Administrator w CMS**:
- Nowa sekcja "Panel Lidera" z tabelą wszystkich partnerów
- Per partner: przełączniki dla każdej funkcji
- Jedno miejsce do zarządzania wszystkimi uprawnieniami lidera
