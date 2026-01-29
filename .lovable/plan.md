

# Plan: Panel zarządzania PureLinkami wszystkich użytkowników

## Podsumowanie

Przebuduję komponent `AllUserReflinksPanel.tsx` tak, aby wyświetlał **listę wszystkich użytkowników** (nawet tych bez PureLinków) z możliwością rozwinięcia każdego użytkownika i zarządzania jego linkami. Administrator będzie mógł:

1. Widzieć wszystkich użytkowników (90 aktywnych) w formie rozwijanej listy
2. Generować PureLinki za użytkowników (dla klienta/partnera/specjalisty)
3. Kopiować linki i pobierać kody QR
4. Włączać/wyłączać i usuwać poszczególne linki
5. Widzieć statystyki (kliknięcia, rejestracje, data wygaśnięcia)

## Nowy wygląd panelu

```text
┌────────────────────────────────────────────────────────────────────┐
│ 🔗 Wszystkie PureLinki użytkowników                                │
│ Zarządzaj linkami polecającymi wszystkich użytkowników             │
├────────────────────────────────────────────────────────────────────┤
│ [🔍 Szukaj użytkownika...        ] [Rola ▼] [Odśwież]              │
│                                                                    │
│ Użytkownicy: 90 | Z linkami: 15 | Wszystkich linków: 32            │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│ ▶ Sebastian Snopek (admin) - sebastian@snopek.pl - 3 linki        │
│ ▼ Urszula Gałażyn (partner) - urszulag@proton.me - 2 linki        │
│   ┌──────────────────────────────────────────────────────────────┐ │
│   │ [+ Generuj link ▼]  Wybierz: Klient | Partner | Specjalista  │ │
│   ├──────────────────────────────────────────────────────────────┤ │
│   │ 🏷️ Klient | u-bwvtp5-121142263 | ✓ 28dni | 5🖱 | 2👤          │ │
│   │                                   [QR] [📋] [on/off] [🗑️]     │ │
│   ├──────────────────────────────────────────────────────────────┤ │
│   │ 🏷️ Partner | u-6poiga-121142263 | ⚠️ 3dni | 1🖱 | 0👤         │ │
│   │                                   [QR] [📋] [on/off] [🗑️]     │ │
│   └──────────────────────────────────────────────────────────────┘ │
│ ▶ Joanna Górska (partner) - joanna.gorska@... - 3 linki           │
│ ▶ Izabela Augustowska (partner) - i.augustowska@... - 0 linków    │
│ ...                                                                │
└────────────────────────────────────────────────────────────────────┘
```

## Zmiany do wprowadzenia

### 1. Przebudowa `AllUserReflinksPanel.tsx`

Zamiast flat table wszystkich linków - lista użytkowników z akordeonem:

**Nowe dane:**
```typescript
interface UserWithReflinks {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  eq_id: string | null;
  role: string;
  reflinks: UserReflink[];
}
```

**Nowe zapytanie - pobierz wszystkich użytkowników + ich linki:**
```typescript
// Krok 1: Pobierz wszystkich użytkowników
const { data: users } = await supabase
  .from('profiles')
  .select('user_id, first_name, last_name, email, eq_id, role')
  .eq('is_active', true)
  .order('last_name');

// Krok 2: Pobierz wszystkie purelinki
const { data: allReflinks } = await supabase
  .from('user_reflinks')
  .select('*')
  .order('created_at', { ascending: false });

// Krok 3: Połącz dane w jedną strukturę
const usersWithReflinks = users.map(user => ({
  ...user,
  reflinks: allReflinks.filter(r => r.creator_user_id === user.user_id)
}));
```

### 2. Nowe funkcjonalności

#### A) Generowanie linku za użytkownika
```typescript
const handleGenerateForUser = async (userId: string, eqId: string, targetRole: AppRole) => {
  // 1. Wygeneruj unikalny kod
  const { data: newCode } = await supabase.rpc('generate_user_reflink_code', {
    p_eq_id: eqId || 'anon'
  });
  
  // 2. Oblicz datę wygaśnięcia
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + globalValidityDays);
  
  // 3. Utwórz link w imieniu użytkownika
  await supabase.from('user_reflinks').insert({
    creator_user_id: userId,
    target_role: targetRole,
    reflink_code: newCode,
    expires_at: expiresAt.toISOString(),
  });
};
```

#### B) Kopiowanie linku
```typescript
const handleCopy = async (reflinkCode: string) => {
  const fullUrl = `${window.location.origin}/auth?ref=${reflinkCode}`;
  await navigator.clipboard.writeText(fullUrl);
  toast({ title: 'Skopiowano!', description: fullUrl });
};
```

#### C) Kod QR
Wykorzystanie istniejącego komponentu `ReflinkQRCode` dla każdego linku.

### 3. Komponenty UI

- **Accordion** - rozwijana lista użytkowników
- **DropdownMenu** - wybór roli przy generowaniu
- **Switch** - włączanie/wyłączanie linków
- **ReflinkQRCode** - istniejący komponent
- **ReflinkStatusBadge** - istniejący komponent

### 4. Filtry

- **Wyszukiwarka** - szukaj po imieniu, nazwisku, emailu
- **Filtr roli użytkownika** - admin/partner/specjalista/klient
- **Opcjonalnie** - pokaż tylko użytkowników z linkami / bez linków

## Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/components/admin/AllUserReflinksPanel.tsx` | Pełna przebudowa - lista użytkowników z akordeonem |

## Szczegóły techniczne

### Struktura komponentu

```typescript
export const AllUserReflinksPanel: React.FC = () => {
  // State
  const [users, setUsers] = useState<UserWithReflinks[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [globalValidityDays, setGlobalValidityDays] = useState(30);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);

  // Fetch all users with their reflinks
  const fetchData = async () => { ... };

  // Generate reflink for a user
  const handleGenerateForUser = async (
    userId: string, 
    eqId: string, 
    targetRole: AppRole
  ) => { ... };

  // Toggle link status
  const handleToggle = async (id: string, currentState: boolean) => { ... };

  // Delete link
  const handleDelete = async (id: string) => { ... };

  // Copy link URL
  const handleCopy = async (reflinkCode: string) => { ... };

  // Filtered users list
  const filteredUsers = useMemo(() => { ... }, [users, searchQuery, roleFilter]);

  return (
    <Card>
      <CardHeader>...</CardHeader>
      <CardContent>
        {/* Filters */}
        {/* Stats */}
        {/* Accordion with users */}
        <Accordion type="single" collapsible>
          {filteredUsers.map(user => (
            <AccordionItem key={user.user_id} value={user.user_id}>
              <AccordionTrigger>
                {/* User info + reflink count */}
              </AccordionTrigger>
              <AccordionContent>
                {/* Generate button + list of reflinks */}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
};
```

### Generowanie linku - dropdown

```typescript
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button size="sm" disabled={generatingFor === user.user_id}>
      <Plus className="w-4 h-4 mr-2" />
      Generuj link
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem onClick={() => handleGenerateForUser(user.user_id, user.eq_id, 'client')}>
      Dla Klienta
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => handleGenerateForUser(user.user_id, user.eq_id, 'partner')}>
      Dla Partnera
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => handleGenerateForUser(user.user_id, user.eq_id, 'specjalista')}>
      Dla Specjalisty
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### Wyświetlanie linku użytkownika

```typescript
<div className="flex items-center gap-2 p-2 border rounded">
  <Badge variant="outline">{getRoleLabel(reflink.target_role)}</Badge>
  <span className="font-mono text-xs flex-1">{reflink.reflink_code}</span>
  <ReflinkStatusBadge expiresAt={reflink.expires_at} />
  <span className="text-xs text-muted-foreground">{reflink.click_count}🖱</span>
  <span className="text-xs text-muted-foreground">{reflink.registration_count}👤</span>
  
  {/* Actions */}
  <ReflinkQRCode reflinkCode={reflink.reflink_code} targetRole={reflink.target_role} />
  <Button size="icon" variant="ghost" onClick={() => handleCopy(reflink.reflink_code)}>
    <Copy className="w-4 h-4" />
  </Button>
  <Switch 
    checked={reflink.is_active} 
    onCheckedChange={() => handleToggle(reflink.id, reflink.is_active)} 
  />
  <AlertDialog>
    {/* Delete confirmation */}
  </AlertDialog>
</div>
```

## Bezpieczeństwo

- Panel dostępny tylko dla administratorów (ścieżka `/admin`)
- Operacje INSERT/UPDATE/DELETE chronione przez istniejące polityki RLS (admin ma pełen dostęp)
- Generowanie linków w imieniu użytkownika wykorzystuje to samo RPC co użytkownicy
- Usuwanie wymaga potwierdzenia przez AlertDialog

## Podsumowanie zmian

1. **Widok główny**: Lista wszystkich 90 użytkowników (nie tylko tych z linkami)
2. **Akordeon**: Kliknięcie w użytkownika rozwija jego PureLinki
3. **Generowanie**: Przycisk "Generuj link" z wyborem roli (klient/partner/specjalista)
4. **Zarządzanie**: Dla każdego linku: QR, kopiowanie, włącz/wyłącz, usuń
5. **Statystyki**: Kliknięcia i rejestracje widoczne przy każdym linku

