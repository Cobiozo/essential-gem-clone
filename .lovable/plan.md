

# Plan: Przełącznik widoczności modułu "Czat" w pasku bocznym per rola

## Cel

Dodać dla administratora globalny przełącznik, który pozwala kontrolować widoczność modułu "Czat" w pasku bocznym dashboardu dla poszczególnych ról: **Admin**, **Partner**, **Klient**, **Specjalista**.

## Wizualizacja rozwiązania

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│  Panel administracyjny → Komunikacja → Kierunki komunikacji                 │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  💬 Widoczność modułu Czat                                             │  │
│  │  ──────────────────────────────────────────────────────────────────    │  │
│  │  Kontroluj, które role widzą moduł "Czat" w pasku bocznym              │  │
│  │                                                                        │  │
│  │   ┌────────────┬────────────────────────────────┬───────────────────┐  │  │
│  │   │   Rola     │        Opis                    │    Widoczność     │  │  │
│  │   ├────────────┼────────────────────────────────┼───────────────────┤  │  │
│  │   │ Admin      │ Administratorzy                │    [🟢 ON ]       │  │  │
│  │   │ Partner    │ Partnerzy                      │    [🟢 ON ]       │  │  │
│  │   │ Specjalista│ Specjaliści                    │    [🟢 ON ]       │  │  │
│  │   │ Klient     │ Klienci                        │    [⚪ OFF]       │  │  │
│  │   └────────────┴────────────────────────────────┴───────────────────┘  │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  📧 Kierunki komunikacji (istniejące)                                  │  │
│  │  ──────────────────────────────────────────────────────────────────    │  │
│  │  ...                                                                   │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Architektura rozwiązania

### Baza danych

**Nowa tabela: `chat_sidebar_visibility`**

| Kolumna | Typ | Opis |
|---------|-----|------|
| id | uuid | Klucz główny |
| visible_to_admin | boolean | Widoczność dla administratorów (default: true) |
| visible_to_partner | boolean | Widoczność dla partnerów (default: true) |
| visible_to_specjalista | boolean | Widoczność dla specjalistów (default: true) |
| visible_to_client | boolean | Widoczność dla klientów (default: true) |
| created_at | timestamp | Data utworzenia |
| updated_at | timestamp | Data aktualizacji |

Tabela będzie zawierać tylko jeden wiersz (singleton pattern) - tak jak `organization_tree_settings`.

### Komponenty do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/components/admin/ChatPermissionsManagement.tsx` | Dodanie sekcji "Widoczność modułu Czat" na górze z 4 przełącznikami per rola |
| `src/components/dashboard/DashboardSidebar.tsx` | Dodanie sprawdzenia widoczności przed wyświetleniem pozycji "Czat" |

### Nowy hook

**`src/hooks/useChatSidebarVisibility.ts`**

Hook do pobierania ustawień widoczności czatu w sidebarze:
```typescript
export const useChatSidebarVisibility = () => {
  // Pobiera ustawienia z tabeli chat_sidebar_visibility
  // Zwraca { isVisibleForRole: (role: string) => boolean, loading }
}
```

## Szczegóły implementacji

### Krok 1: Migracja bazy danych

```sql
CREATE TABLE chat_sidebar_visibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visible_to_admin boolean NOT NULL DEFAULT true,
  visible_to_partner boolean NOT NULL DEFAULT true,
  visible_to_specjalista boolean NOT NULL DEFAULT true,
  visible_to_client boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Wstaw domyślny wiersz
INSERT INTO chat_sidebar_visibility (id) VALUES (gen_random_uuid());

-- RLS policies
ALTER TABLE chat_sidebar_visibility ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read" ON chat_sidebar_visibility
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only admins can update" ON chat_sidebar_visibility
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
```

### Krok 2: Aktualizacja ChatPermissionsManagement.tsx

Dodanie nowej sekcji na górze komponentu:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  💬 Widoczność modułu Czat                                              │
│  ─────────────────────────────────────────────────────────────────────  │
│  Określ, które role widzą pozycję "Czat" w menu bocznym                 │
│                                                                         │
│  ┌─────────────────┬─────────────────────────────────────────────────┐  │
│  │  Administrator  │  [🟢 Switch] Administratorzy widzą moduł Czat   │  │
│  │  Partner        │  [🟢 Switch] Partnerzy widzą moduł Czat         │  │
│  │  Specjalista    │  [🟢 Switch] Specjaliści widzą moduł Czat       │  │
│  │  Klient         │  [🟢 Switch] Klienci widzą moduł Czat           │  │
│  └─────────────────┴─────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Krok 3: Modyfikacja DashboardSidebar.tsx

W sekcji `useEffect` - dodanie pobierania ustawień widoczności czatu:

```typescript
// Existing visibility fetch
const [chatVisible, setChatVisible] = useState(true);

useEffect(() => {
  const fetchChatVisibility = async () => {
    const { data } = await supabase
      .from('chat_sidebar_visibility')
      .select('*')
      .limit(1)
      .single();
      
    if (data) {
      const role = userRole?.role?.toLowerCase();
      const visible = 
        (role === 'admin' && data.visible_to_admin) ||
        (role === 'partner' && data.visible_to_partner) ||
        (role === 'specjalista' && data.visible_to_specjalista) ||
        (role === 'client' && data.visible_to_client);
      setChatVisible(visible);
    }
  };
  
  if (userRole) {
    fetchChatVisibility();
  }
}, [userRole]);
```

W filtrze `visibleMenuItems`:

```typescript
// Dodanie warunku dla chat
if (item.id === 'chat' && !chatVisible) {
  return false;
}
```

## Pliki do utworzenia

| Plik | Opis |
|------|------|
| Migracja SQL | Tabela `chat_sidebar_visibility` z RLS |

## Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/components/admin/ChatPermissionsManagement.tsx` | Nowa sekcja "Widoczność modułu Czat" z 4 przełącznikami |
| `src/components/dashboard/DashboardSidebar.tsx` | Pobieranie i sprawdzanie widoczności przed wyświetleniem "Czat" |
| `src/integrations/supabase/types.ts` | Automatycznie zaktualizowane przez migrację |

## Flow użytkownika

1. Admin otwiera Panel CMS → Komunikacja → Kierunki komunikacji
2. Na górze widzi nową sekcję "Widoczność modułu Czat"
3. Może wyłączyć/włączyć widoczność dla każdej roli osobno
4. Po wyłączeniu np. dla "Klient" - klienci nie widzą pozycji "Czat" w menu bocznym
5. Zmiana jest natychmiastowa (po odświeżeniu strony przez użytkownika)

## Zgodność z zasadami projektu

- **Brak elementu = niewidoczność**: Gdy wyłączone - pozycja "Czat" po prostu nie renderuje się (nie jest wyszarzona ani ukryta)
- **Hierarchia ról zachowana**: Ta funkcja kontroluje tylko widoczność modułu w menu, nie wpływa na istniejące uprawnienia komunikacyjne
- **Wzorzec singleton**: Jedna tabela, jeden wiersz - jak w `organization_tree_settings`

