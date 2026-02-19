
# Panel Lidera — dedykowana strona dla funkcji liderskich

## Analiza stanu obecnego

### Gdzie teraz żyją funkcje lidera?

Aktualnie wszystko jest "wrzucone" do `MyAccount.tsx` jako kolejne zakładki:

| Funkcja | Lokalizacja w MyAccount | Warunek widoczności |
|---------|------------------------|---------------------|
| Spotkania indywidualne (ustawienia) | zakładka `individual-meetings` | `leaderPermission?.individual_meetings_enabled` |
| Spotkania trójstronne | sidebar → podmenu | `tripartite_meeting_enabled` |
| Konsultacje | sidebar → podmenu | `partner_consultation_enabled` |
| Postęp szkoleń zespołu (planowany) | zakładka `team-training` | `can_view_team_progress` (nowa flaga) |

Efekt: zakładki w MyAccount są **przepełnione** i nie ma jasnej granicy między "moimi ustawieniami" a "narzędziami lidera".

### Wzorzec istniejący w aplikacji

Projekt stosuje już wzorzec osobnych stron dla dedykowanych ról:
- `/admin` → `Admin.tsx` dla adminów
- `/my-account` → `MyAccount.tsx` dla wszystkich
- `/events/individual-meetings` → `IndividualMeetingsPage.tsx` dla użytkowników rezerwujących

Logiczne dopełnienie: `/leader` → `LeaderPanel.tsx` dla liderów.

### Co trafia do panelu lidera?

**Teraz (do przeniesienia):**
- Zarządzanie spotkaniami indywidualnymi (`UnifiedMeetingSettingsForm`) — przeniesione z zakładki `individual-meetings` w MyAccount
- Historia spotkań indywidualnych

**Nowe (z zaplanowanego zadania):**
- Postęp szkoleń struktury (`TeamTrainingProgressView`) — widok postępu całego zespołu w dół

**Struktura panelu — zakładki wewnątrz `/leader`:**

```
Panel Lidera (/leader)
├── 📅 Spotkania indywidualne  ← (istniejący UnifiedMeetingSettingsForm)
│   ├── Ustawienia spotkań
│   └── Historia spotkań
└── 🎓 Szkolenia zespołu       ← (nowy TeamTrainingProgressView)
    ├── tylko gdy can_view_team_progress = true
    └── postęp w dół struktury
```

---

## Architektura techniczna

### 1. Nowa strona `src/pages/LeaderPanel.tsx`

Pełna strona z `DashboardLayout` (tak jak `IndividualMeetingsPage.tsx`).

Dostęp sprawdzany przez `useLeaderAvailability()`:
- Jeśli `!isLeader` → przekierowanie do `/dashboard` z komunikatem toast
- Jeśli `isLeader` → wyświetlenie panelu z zakładkami odpowiadającymi włączonym uprawnieniom

```
Logika zakładek w LeaderPanel:
- "Spotkania indywidualne" → widoczna gdy individual_meetings_enabled = true
- "Szkolenia zespołu"     → widoczna gdy can_view_team_progress = true
```

### 2. Nowa trasa w `App.tsx`

```typescript
const LeaderPanel = lazyWithRetry(() => import("./pages/LeaderPanel"));
// w Routes:
<Route path="/leader" element={<LeaderPanel />} />
```

### 3. Wpis w `DashboardSidebar.tsx`

Nowy element w menu sidebar dla liderów — pojawia się **tylko gdy** użytkownik ma aktywne uprawnienia lidera:

```typescript
// Nowy wpis w menuItems (warunkowy)
...(isPartner && (individualMeetingsEnabled.tripartite || individualMeetingsEnabled.consultation) ? [{
  id: 'leader-panel',
  icon: Crown,        // lub Shield lub Star
  labelKey: 'Panel Lidera',
  path: '/leader',
}] : [])
```

Zastępuje dotychczasowy rozbudowany podmenu `individual-meetings-setup` w sidebarze — teraz wszystko prowadzi do jednego miejsca `/leader` zamiast głęboko zagnieżdżonych ścieżek jak `/my-account?tab=individual-meetings&type=tripartite`.

### 4. Migracja SQL (z poprzedniego planu)

Dodanie `can_view_team_progress` do `leader_permissions` i funkcji `get_leader_team_training_progress` — to samo co planowaliśmy, tylko wynik trafia teraz do zakładki w `LeaderPanel` zamiast `MyAccount`.

### 5. Rozszerzenie `IndividualMeetingsManagement.tsx` (panel admin)

Dodanie kolumny "Szkolenia zespołu" z przełącznikiem `can_view_team_progress` — admin decyduje kto ma dostęp do jakiej zakładki w panelu lidera.

### 6. Nowy komponent `TeamTrainingProgressView.tsx`

Widok postępu szkoleń całej struktury — przeniesiony z planu do `src/components/training/TeamTrainingProgressView.tsx`.

### 7. Usunięcie zakładki z `MyAccount.tsx`

Po dodaniu `/leader` — usunięcie zakładki `individual-meetings` z `MyAccount.tsx` i jej pozycji z `visibleTabs`. Link z sidebara już nie będzie kierował do `/my-account?tab=individual-meetings`, tylko do `/leader`.

---

## Szczegół: jak wygląda panel lidera

```
┌─────────────────────────────────────────────────────┐
│  👑 Panel Lidera                                     │
│  Narzędzia i statystyki Twojej struktury            │
├─────────────────────────────────────────────────────┤
│  [📅 Spotkania ind.]  [🎓 Szkolenia zespołu]        │
│  (gdy individual_    (gdy can_view_team_            │
│   meetings_enabled)   progress = true)              │
├─────────────────────────────────────────────────────┤
│                                                      │
│  <UnifiedMeetingSettingsForm />                     │
│  (obecna zakładka z MyAccount)                      │
│                                                      │
│  lub                                                 │
│                                                      │
│  <TeamTrainingProgressView />                       │
│  (nowy widok postępu struktury)                     │
│                                                      │
└─────────────────────────────────────────────────────┘
```

Jeśli lider ma włączone OBIE funkcje → dwie zakładki. Jeśli tylko jedną → jedna zakładka (bez widocznych zakładek = bezpośrednio komponent). Jeśli żadnej → przekierowanie do dashboardu.

---

## Pliki do zmiany/utworzenia

| Plik | Operacja | Opis |
|------|----------|------|
| `supabase/migrations/..._leader_team_progress.sql` | Nowy | `ALTER TABLE leader_permissions ADD COLUMN can_view_team_progress`, funkcja SQL `get_leader_team_training_progress` |
| `src/pages/LeaderPanel.tsx` | Nowy | Dedykowana strona panelu lidera z zakładkami |
| `src/components/training/TeamTrainingProgressView.tsx` | Nowy | Widok postępu szkoleń struktury lidera |
| `src/components/admin/IndividualMeetingsManagement.tsx` | Edycja | Dodanie kolumny "Szkolenia zespołu" z przełącznikiem |
| `src/App.tsx` | Edycja | Dodanie trasy `/leader` |
| `src/components/dashboard/DashboardSidebar.tsx` | Edycja | Zastąpienie podmenu `individual-meetings-setup` linkiem do `/leader` |
| `src/pages/MyAccount.tsx` | Edycja | Usunięcie zakładki `individual-meetings` (przeniesionej do `/leader`) |

---

## Co admin kontroluje w `IndividualMeetingsManagement`

Po zmianach tabela w panelu admina będzie wyglądać tak:

| Partner | Email | Spotkania trójstronne | Konsultacje | Szkolenia zespołu |
|---------|-------|----------------------|-------------|-------------------|
| Jan K. | ... | ○ | ● | ○ |
| Anna N. | ... | ● | ● | ● |

Każdy przełącznik niezależnie — admin decyduje co dana osoba widzi w Panelu Lidera.

---

## Bezpieczeństwo

- Strona `/leader` sprawdza `isLeader` (z `useLeaderAvailability`) → redirect jeśli brak uprawnień
- Funkcja SQL `get_leader_team_training_progress` sprawdza `can_view_team_progress` w bazie przed zwróceniem danych
- Lider widzi tylko swoją strukturę (rekurencyjnie od siebie w dół przez `upline_eq_id`)
- Admin zachowuje pełną kontrolę przez `IndividualMeetingsManagement`
