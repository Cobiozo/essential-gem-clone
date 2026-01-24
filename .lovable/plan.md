
# Drzewo Struktury Organizacji z Panelem Administracyjnym

## Cel

Stworzenie funkcjonalności wyświetlania hierarchii zespołu z **dwoma widokami**:
1. **Widok listy** - tekstowe drzewo ze zwijaniem/rozwijaniem
2. **Widok wizualnego grafu** - z avatarami/inicjałami i liniami łączącymi (jak na screenie)

**Wszystkie ustawienia** widoczności, parametrów wyświetlania i dostępu kontrolowane są przez **administratora w panelu CMS**.

---

## Panel Administracyjny - Ustawienia Struktury Organizacji

### Nowa tabela ustawień: `organization_tree_settings`

| Kolumna | Typ | Opis |
|---------|-----|------|
| `id` | UUID | Klucz główny |
| `is_enabled` | boolean | Czy funkcja jest aktywna globalnie |
| `max_depth` | integer | Maksymalna głębokość drzewa (1-10) |
| `default_view` | text | Domyślny widok: 'list' / 'graph' |
| **Widoczność funkcji** | | |
| `visible_to_clients` | boolean | Czy klienci widzą swoją strukturę |
| `visible_to_partners` | boolean | Czy partnerzy widzą strukturę |
| `visible_to_specjalista` | boolean | Czy specjaliści widzą strukturę |
| **Widoczność danych** | | |
| `show_eq_id` | boolean | Czy pokazywać EQID |
| `show_email` | boolean | Czy pokazywać email |
| `show_phone` | boolean | Czy pokazywać telefon |
| `show_role_badge` | boolean | Czy pokazywać badge roli |
| `show_avatar` | boolean | Czy pokazywać avatary |
| `show_upline` | boolean | Czy pokazywać opiekuna powyżej |
| `show_statistics` | boolean | Czy pokazywać statystyki |
| **Opcje widoku grafu** | | |
| `graph_node_size` | text | Rozmiar węzła: 'small' / 'medium' / 'large' |
| `graph_show_lines` | boolean | Czy pokazywać linie łączące |
| `graph_expandable` | boolean | Czy węzły można rozwijać/zwijać |
| **Limity per rola** | | |
| `client_max_depth` | integer | Głębokość dla klientów (domyślnie 0) |
| `partner_max_depth` | integer | Głębokość dla partnerów (domyślnie 10) |
| `specjalista_max_depth` | integer | Głębokość dla specjalistów (domyślnie 5) |

### Nowy komponent: `OrganizationTreeManagement.tsx`

Wzorowany na `SpecialistSearchManagement.tsx`:

```text
┌────────────────────────────────────────────────────────────────────────┐
│  Panel Admina → Funkcje → Struktura organizacji                        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  🌳 Struktura organizacji                                       │  │
│  │  Konfiguracja wizualnego drzewa struktury zespołu               │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌── Funkcja aktywna ─────────────────────────────────────── [ON] ──┐ │
│  │  Włącz lub wyłącz strukturę organizacji dla użytkowników        │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  ▼ Dostęp do funkcji                                                   │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │  Klienci            [OFF]  ← Klienci nie widzą struktury        │ │
│  │  Partnerzy          [ON]   ← Partnerzy widzą swoją organizację  │ │
│  │  Specjaliści        [ON]   ← Specjaliści widzą strukturę        │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  ▼ Widoczność danych w węzłach                                         │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │  [✓] Avatar / Inicjały                                          │ │
│  │  [✓] Imię i nazwisko                                            │ │
│  │  [✓] Badge roli (Partner/Specjalista/Klient)                    │ │
│  │  [ ] EQID                                                        │ │
│  │  [ ] Email                                                       │ │
│  │  [ ] Telefon                                                     │ │
│  │  [✓] Statystyki gałęzi (np. "+3 👤")                            │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  ▼ Parametry drzewa                                                    │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │  Domyślny widok:     [Lista ▼]                                  │ │
│  │                                                                  │ │
│  │  Maksymalna głębokość per rola:                                 │ │
│  │  • Partnerzy:        [10] poziomów                              │ │
│  │  • Specjaliści:      [5 ] poziomów                              │ │
│  │  • Klienci:          [0 ] (tylko siebie)                        │ │
│  │                                                                  │ │
│  │  [✓] Pokaż opiekuna powyżej (upline)                            │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  ▼ Ustawienia widoku graficznego                                       │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │  Rozmiar węzłów:     [Średni ▼]                                 │ │
│  │  [✓] Linie łączące węzły                                        │ │
│  │  [✓] Możliwość zwijania/rozwijania gałęzi                       │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │                                            [💾 Zapisz ustawienia]│ │
│  └──────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Wizualizacja dla użytkownika

### Widok graficzny (wzorowany na screenie)

```text
┌────────────────────────────────────────────────────────────────────────┐
│  Struktura organizacji                        [📋 Lista] [🌳 Graf*]   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                        │
│                    📤 TWÓJ OPIEKUN                                     │
│                         │                                              │
│                    ┌────┴────┐                                        │
│                    │ [FOTO]  │                                        │
│                    │   JK    │  Jan Kowalski                          │
│                    │ Partner │                                        │
│                    └────┬────┘                                        │
│                         │                                              │
│  ═══════════════════════╪════════════════════════════════════════════  │
│                         │                                              │
│                    ⭐ TY                                               │
│                    ┌────┴────┐                                        │
│                    │ [AVA]   │                                        │
│                    │   SS    │  Sebastian Snopek                      │
│                    │ Partner │                                        │
│                    └────┬────┘                                        │
│                         │                                              │
│  ═══════════════════════╪════════════════════════════════════════════  │
│            ┌────────┬───┴───┬────────┬────────┐                       │
│            │        │       │        │        │                       │
│       ┌────┴────┐ ┌─┴──┐ ┌──┴──┐ ┌──┴──┐ ┌──┴──┐                     │
│       │ [FOTO]  │ │ KS │ │ SS │ │ TL │ │ IL │                        │
│       │   GL    │ │Spec│ │Kli.│ │Part│ │Part│                        │
│       │ Partner │ └────┘ └────┘ └─┬──┘ └─┬──┘                        │
│       │  +1 👤  │                 │      │                            │
│       └────┬────┘            ┌──┴──┐ ┌──┴──┐                         │
│            │                 │ RK │ │ JM │                           │
│       ┌────┴────┐            │Part│ │Part│                           │
│       │   JS    │            └────┘ └────┘                           │
│       │ Partner │                                                     │
│       └─────────┘                                                     │
│                                                                        │
│  Legenda: 🔵 Partner  🟣 Specjalista  🟢 Klient                       │
│  Statystyki: 7 Partnerów | 1 Specjalista | 1 Klient | 9 osób łącznie │
└────────────────────────────────────────────────────────────────────────┘
```

### Węzeł z avatarem lub inicjałami

```text
┌─────────────────┐         ┌─────────────────┐
│    [ZDJĘCIE]    │    LUB  │      [ GL ]     │  ← Inicjały w kolorze roli
│                 │         │   (kółko)       │
├─────────────────┤         ├─────────────────┤
│ Grzegorz        │         │ Grzegorz        │
│ Latocha         │         │ Latocha         │
├─────────────────┤         ├─────────────────┤
│  🔵 Partner     │         │  🔵 Partner     │
│    +1 👤        │         │    +1 👤        │  ← Licznik podległych
└─────────────────┘         └─────────────────┘
```

---

## Architektura techniczna

### 1. Migracja SQL

**Plik**: `supabase/migrations/xxx_organization_tree_settings.sql`

```sql
-- Tabela ustawień struktury organizacji
CREATE TABLE public.organization_tree_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  max_depth INTEGER NOT NULL DEFAULT 10,
  default_view TEXT NOT NULL DEFAULT 'list',
  
  -- Widoczność funkcji per rola
  visible_to_clients BOOLEAN NOT NULL DEFAULT false,
  visible_to_partners BOOLEAN NOT NULL DEFAULT true,
  visible_to_specjalista BOOLEAN NOT NULL DEFAULT true,
  
  -- Widoczność danych w węzłach
  show_eq_id BOOLEAN NOT NULL DEFAULT false,
  show_email BOOLEAN NOT NULL DEFAULT false,
  show_phone BOOLEAN NOT NULL DEFAULT false,
  show_role_badge BOOLEAN NOT NULL DEFAULT true,
  show_avatar BOOLEAN NOT NULL DEFAULT true,
  show_upline BOOLEAN NOT NULL DEFAULT true,
  show_statistics BOOLEAN NOT NULL DEFAULT true,
  
  -- Ustawienia grafu
  graph_node_size TEXT NOT NULL DEFAULT 'medium',
  graph_show_lines BOOLEAN NOT NULL DEFAULT true,
  graph_expandable BOOLEAN NOT NULL DEFAULT true,
  
  -- Limity głębokości per rola
  client_max_depth INTEGER NOT NULL DEFAULT 0,
  partner_max_depth INTEGER NOT NULL DEFAULT 10,
  specjalista_max_depth INTEGER NOT NULL DEFAULT 5,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.organization_tree_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage organization tree settings"
ON public.organization_tree_settings FOR ALL
USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Everyone can view settings"
ON public.organization_tree_settings FOR SELECT USING (true);

-- Trigger updated_at
CREATE TRIGGER update_organization_tree_settings_updated_at
BEFORE UPDATE ON public.organization_tree_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Domyślne ustawienia
INSERT INTO public.organization_tree_settings (id) 
VALUES (gen_random_uuid());
```

### 2. Funkcja pobierania struktury

**Plik**: `supabase/migrations/xxx_organization_tree_function.sql`

```sql
CREATE OR REPLACE FUNCTION public.get_organization_tree(
  p_root_eq_id TEXT,
  p_max_depth INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  last_name TEXT,
  eq_id TEXT,
  upline_eq_id TEXT,
  role TEXT,
  avatar_url TEXT,
  level INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE tree AS (
    SELECT 
      p.user_id as id, p.first_name, p.last_name, 
      p.eq_id, p.upline_eq_id, p.role, p.avatar_url, 
      0 as level
    FROM profiles p
    WHERE p.eq_id = p_root_eq_id AND p.is_active = true
    
    UNION ALL
    
    SELECT 
      p.user_id, p.first_name, p.last_name,
      p.eq_id, p.upline_eq_id, p.role, p.avatar_url,
      t.level + 1
    FROM profiles p
    INNER JOIN tree t ON p.upline_eq_id = t.eq_id
    WHERE t.level < p_max_depth AND p.is_active = true
  )
  SELECT * FROM tree ORDER BY level, role, first_name;
END;
$$;
```

### 3. Pliki do utworzenia

| Plik | Opis |
|------|------|
| `src/components/admin/OrganizationTreeManagement.tsx` | Panel admina - ustawienia |
| `src/hooks/useOrganizationTree.ts` | Hook do pobierania drzewa + ustawień |
| `src/hooks/useOrganizationTreeSettings.ts` | Hook do ustawień (cache) |
| `src/components/team-contacts/OrganizationChart.tsx` | Widok graficzny (SVG) |
| `src/components/team-contacts/OrganizationNode.tsx` | Pojedynczy węzeł |
| `src/components/team-contacts/OrganizationList.tsx` | Widok listy (accordion) |

### 4. Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/components/admin/AdminSidebar.tsx` | Dodanie pozycji "Struktura organizacji" |
| `src/pages/Admin.tsx` | Renderowanie `OrganizationTreeManagement` |
| `src/components/team-contacts/TeamContactsTab.tsx` | Nowy widok "Struktura" |
| `src/components/team-contacts/types.ts` | Nowe interfejsy |

---

## Dynamiczna aktualizacja

Gdy administrator zmieni opiekuna użytkownika (przez `admin_change_user_guardian`):
- Użytkownik wraz z całą gałęzią podległych automatycznie przenosi się pod nowego opiekuna
- Struktura odświeża się przy każdym wejściu na stronę
- Dane są zawsze aktualne z bazy `profiles`

---

## Bezpieczeństwo

| Aspekt | Implementacja |
|--------|---------------|
| Dostęp do funkcji | Kontrolowany przez `is_enabled` i `visible_to_*` w ustawieniach |
| Głębokość per rola | Limitowana przez `*_max_depth` (np. klient = 0 = tylko siebie) |
| Dane wrażliwe | Kontrolowane przez `show_email`, `show_phone` itd. |
| Aktywni użytkownicy | Filtr `is_active = true` w funkcji |
| SECURITY DEFINER | Funkcja omija RLS ale weryfikuje uprawnienia |

---

## Podsumowanie implementacji

| Krok | Opis |
|------|------|
| 1. Migracja | Tabela `organization_tree_settings` + funkcja `get_organization_tree` |
| 2. Panel admina | Komponent `OrganizationTreeManagement` w sekcji "Funkcje" |
| 3. Hooki | `useOrganizationTree` + `useOrganizationTreeSettings` |
| 4. Komponenty | `OrganizationChart` (graf) + `OrganizationList` (lista) |
| 5. Integracja | Nowy widok w `TeamContactsTab` z przełącznikiem |
| 6. Responsywność | Graf na desktop, lista na mobile |
