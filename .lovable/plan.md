

# PureBox — Zarządzanie modułem w panelu admina

## Co budujemy
Nowa zakładka "PureBox" w sekcji "Wydarzenia i narzędzia" panelu admina. Admin widzi listę elementów modułu PureBox (Ocena umiejętności, Moje Testy), zarządza widocznością per rola i nadaje dostęp indywidualnym użytkownikom do konkretnych elementów.

## Baza danych

### Nowa tabela `purebox_settings`
Przechowuje ustawienia widoczności per element PureBox:
```sql
create table public.purebox_settings (
  id uuid primary key default gen_random_uuid(),
  element_key text unique not null,       -- 'skills-assessment', 'moje-testy'
  element_name text not null,             -- 'Ocena umiejętności', 'Moje Testy'
  is_active boolean default true,
  visible_to_admin boolean default true,
  visible_to_partner boolean default true,
  visible_to_client boolean default true,
  visible_to_specjalista boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### Nowa tabela `purebox_user_access`
Indywidualny dostęp użytkownika do konkretnego elementu:
```sql
create table public.purebox_user_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  element_key text not null,
  is_enabled boolean default true,
  granted_by uuid references auth.users(id),
  created_at timestamptz default now(),
  unique(user_id, element_key)
);
```

RLS: admin-only for both tables. Seed initial rows for `skills-assessment` and `moje-testy`.

## Nowy komponent: `PureBoxManagement.tsx`

Interfejs podzielony na dwie sekcje:

### Sekcja 1: Elementy modułu i widoczność ról
- Tabela/lista elementów PureBox (Ocena umiejętności, Moje Testy)
- Każdy element: nazwa, Switch aktywności, 4 Switche widoczności (admin/partner/klient/specjalista)
- Wzorowany na PartnerPageAccessManager

### Sekcja 2: Dostęp indywidualny
- Wyszukiwarka użytkowników (imię, email, EQ ID)
- Select do wyboru elementu PureBox
- Przycisk "Dodaj dostęp"
- Lista użytkowników z nadanym dostępem (z możliwością usunięcia i togglowania)

## Integracja

### `AdminSidebar.tsx`
- Dodanie `{ value: 'purebox', labelKey: 'purebox', icon: Sparkles }` do sekcji `events-tools`
- Dodanie label `purebox: 'PureBox'` do `hardcodedLabels`

### `Admin.tsx`
- Import `PureBoxManagement`
- Dodanie `<TabsContent value="purebox"><PureBoxManagement /></TabsContent>`

### `DashboardSidebar.tsx` (opcjonalnie, w przyszłości)
- Filtrowanie elementów PureBox na podstawie `purebox_settings` i `purebox_user_access` + rola użytkownika

## Pliki do zmiany

| Plik | Akcja |
|------|-------|
| Migracja SQL | Nowe tabele + seed |
| `src/components/admin/PureBoxManagement.tsx` | Nowy komponent |
| `src/components/admin/AdminSidebar.tsx` | Dodanie zakładki |
| `src/pages/Admin.tsx` | Rejestracja TabsContent |

