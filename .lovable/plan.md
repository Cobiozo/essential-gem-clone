
# Plan: Panel administracyjny wszystkich PureLinków użytkowników

## Podsumowanie

Utworzę nowy komponent `AllUserReflinksPanel.tsx` w panelu administracyjnym, który wyświetli **wszystkie PureLinki wygenerowane przez wszystkich użytkowników** z możliwością filtrowania, włączania/wyłączania i usuwania każdego linku z osobna.

## Co zostanie dodane

### Nowy komponent: `AllUserReflinksPanel.tsx`

Panel zawierający:

1. **Tabelę wszystkich PureLinków** z kolumnami:
   - Kod linku (`reflink_code`)
   - Rola docelowa (Klient/Partner/Specjalista)
   - Twórca linku (imię, nazwisko, email, rola)
   - Status (aktywny/nieaktywny)
   - Data wygaśnięcia + badge (wygasł/wygasa wkrótce/aktywny)
   - Kliknięcia / Rejestracje
   - Akcje (włącz/wyłącz, usuń)

2. **Filtry**:
   - Wyszukiwanie po kodzie linku lub nazwisku twórcy
   - Filtr po roli docelowej (wszystkie/klient/partner/specjalista)
   - Filtr po statusie (wszystkie/aktywne/nieaktywne/wygasłe)

3. **Akcje masowe**:
   - Przycisk "Usuń wygasłe linki"

## Struktura tabeli

```text
+----------------+--------+------------------+--------+---------+--------+-------+----------+
| Kod linku      | Rola   | Twórca           | Status | Wygasa  | Klikn. | Rej.  | Akcje    |
+----------------+--------+------------------+--------+---------+--------+-------+----------+
| u-3rxrgp-anon  | Spec.  | Sebastian Snopek | ✓      | 28 dni  |   2    |   0   | [on][x]  |
|                |        | (admin)          |        |         |        |       |          |
+----------------+--------+------------------+--------+---------+--------+-------+----------+
| u-j8czca-12... | Spec.  | Sebastian Snopek | ✓      | 30 dni  |   0    |   0   | [on][x]  |
|                |        | (partner)        |        |         |        |       |          |
+----------------+--------+------------------+--------+---------+--------+-------+----------+
```

## Integracja

Komponent zostanie dodany jako **nowa zakładka** w istniejącym `UserReflinksSettings.tsx` lub jako osobna sekcja w `ReflinksManagement.tsx` pod zakładką "Linki użytkowników".

## Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/components/admin/AllUserReflinksPanel.tsx` | **NOWY** - główny komponent panelu |
| `src/components/admin/UserReflinksSettings.tsx` | Dodanie nowej zakładki z `AllUserReflinksPanel` |

---

## Szczegóły techniczne

### Zapytanie do bazy danych

Wykorzystam JOIN między `user_reflinks` a `profiles` aby pobrać dane twórcy:

```typescript
const { data } = await supabase
  .from('user_reflinks')
  .select(`
    *,
    profiles:creator_user_id (
      first_name,
      last_name,
      email,
      eq_id,
      role
    )
  `)
  .order('created_at', { ascending: false });
```

### Funkcje zarządzania

1. **Włącz/Wyłącz link**:
```typescript
await supabase
  .from('user_reflinks')
  .update({ is_active: !currentState })
  .eq('id', reflinkId);
```

2. **Usuń link**:
```typescript
await supabase
  .from('user_reflinks')
  .delete()
  .eq('id', reflinkId);
```

3. **Usuń wszystkie wygasłe**:
```typescript
await supabase
  .from('user_reflinks')
  .delete()
  .lt('expires_at', new Date().toISOString());
```

### Interfejs TypeScript

```typescript
interface UserReflinkWithCreator {
  id: string;
  creator_user_id: string;
  target_role: 'admin' | 'partner' | 'specjalista' | 'client';
  reflink_code: string;
  is_active: boolean;
  click_count: number;
  registration_count: number;
  created_at: string;
  expires_at: string;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    email: string;
    eq_id: string | null;
    role: string;
  };
}
```

### Komponenty UI wykorzystane

- `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableCell` - tabela
- `Input` - wyszukiwarka
- `Select` - filtry
- `Switch` - włączanie/wyłączanie linku
- `Button` - usuwanie
- `Badge` - status, rola
- `ReflinkStatusBadge` - istniejący komponent do wyświetlania statusu wygaśnięcia
- `AlertDialog` - potwierdzenie usunięcia

### Struktura komponentu

```typescript
export const AllUserReflinksPanel: React.FC = () => {
  // State
  const [reflinks, setReflinks] = useState<UserReflinkWithCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Fetch all user reflinks with creator info
  const fetchReflinks = async () => { ... };
  
  // Toggle active status
  const handleToggle = async (id: string, currentState: boolean) => { ... };
  
  // Delete single reflink
  const handleDelete = async (id: string) => { ... };
  
  // Delete all expired
  const handleDeleteExpired = async () => { ... };
  
  // Filtered list based on search and filters
  const filteredReflinks = useMemo(() => { ... }, [reflinks, searchQuery, roleFilter, statusFilter]);
  
  return (
    <Card>
      {/* Filters section */}
      {/* Table with all reflinks */}
      {/* Delete expired button */}
    </Card>
  );
};
```

## Bezpieczeństwo

- Operacje dostępne tylko dla administratorów (panel jest w `/admin`)
- Usuwanie z potwierdzeniem przez `AlertDialog`
- RLS chroni dostęp do danych - admin ma pełne uprawnienia

