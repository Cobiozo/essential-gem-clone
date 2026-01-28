
# Plan: Ochrona stanu + Zakładka "Zablokowani" w zarządzaniu użytkownikami

## Część 1: Ochrona przed odświeżaniem przy zmianie karty

### Problem
Gdy użytkownik edytuje formularz i przełączy się na inną kartę przeglądarki, strona odświeża się lub przenosi na stronę główną, niszcząc pracę.

### Rozwiązanie
Wprowadzenie globalnej flagi edycji blokującej re-rendery podczas aktywnej pracy z formularzami.

### Zmiany techniczne

**1. Nowy plik `src/contexts/EditingContext.tsx`**
- Globalny kontekst śledzący czy użytkownik jest w trybie edycji
- Licznik referencyjny dla wielu jednoczesnych formularzy
- Funkcje: `isEditing`, `setEditing`, `registerEdit`

**2. Nowy plik `src/hooks/useFormProtection.ts`**
- Hook automatycznie rejestrujący stan edycji gdy dialog jest otwarty
- Automatyczne czyszczenie przy zamknięciu

**3. Modyfikacja `src/App.tsx`**
- Dodanie `EditingProvider` jako wrapper

**4. Modyfikacja formularzy administracyjnych**
- `EventsManagement.tsx` - ochrona dialogów wydarzeń
- `HealthyKnowledgeManagement.tsx` - ochrona edycji zasobów
- `ReflinksManagement.tsx` - migracja na globalny kontekst
- `TrainingManagement.tsx` - blokada realtime podczas edycji

---

## Część 2: Nowa zakładka "Zablokowani"

### Problem
Obecnie zakładka "Oczekujący" zawiera zarówno użytkowników oczekujących na zatwierdzenie, jak i dezaktywowanych. Potrzebna jest osobna zakładka dla zablokowanych użytkowników.

### Rozwiązanie
1. Dodanie nowej zakładki "Zablokowani"
2. Zmiana nazwy "Dezaktywuj" na "Zablokuj"
3. Poprawienie filtrów tak, aby:
   - "Oczekujący" = tylko ci, którzy faktycznie czekają na zatwierdzenie (is_active=true ale brak email/guardian/admin approval)
   - "Zablokowani" = is_active=false (zablokowane konta)

### Zmiany techniczne

**1. Modyfikacja `src/pages/Admin.tsx`**

A) Zmiana typu stanu filtra (linia ~390):
```tsx
// Przed:
const [userFilterTab, setUserFilterTab] = useState<'all' | 'active' | 'pending'>('pending');

// Po:
const [userFilterTab, setUserFilterTab] = useState<'all' | 'active' | 'pending' | 'blocked'>('pending');
```

B) Aktualizacja logiki filtrowania (linie ~1741-1750):
```tsx
const filteredAndSortedUsers = useMemo(() => {
  let filtered = users.filter((user) => {
    if (userFilterTab === 'active') {
      // W pełni zatwierdzeni i aktywni
      return user.email_activated && user.guardian_approved && user.admin_approved && user.is_active;
    } else if (userFilterTab === 'pending') {
      // NOWE: Oczekujący = aktywni ALE brakuje zatwierdzeń
      return user.is_active && (!user.email_activated || !user.guardian_approved || !user.admin_approved);
    } else if (userFilterTab === 'blocked') {
      // NOWE: Zablokowani = nieaktywni
      return !user.is_active;
    }
    return true; // 'all'
  });
  // ... reszta bez zmian
}, [...]);
```

C) Aktualizacja liczników (linie ~1789-1793):
```tsx
const userCounts = useMemo(() => {
  const blocked = users.filter(u => !u.is_active).length;
  const pending = users.filter(u => u.is_active && (!u.email_activated || !u.guardian_approved || !u.admin_approved)).length;
  const active = users.filter(u => u.email_activated && u.guardian_approved && u.admin_approved && u.is_active).length;
  return { pending, active, blocked, all: users.length };
}, [users]);
```

D) Dodanie nowej zakładki w UI (po linii ~4076):
```tsx
<button
  onClick={() => setUserFilterTab('blocked')}
  className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
    userFilterTab === 'blocked' 
      ? 'bg-background text-foreground shadow' 
      : 'hover:bg-background/50'
  }`}
>
  Zablokowani
  {userCounts.blocked > 0 && (
    <Badge variant="outline" className="ml-2 h-5 px-1.5 text-xs border-red-300 text-red-600">
      {userCounts.blocked}
    </Badge>
  )}
</button>
```

E) Aktualizacja pustych stanów (linie ~4182-4186):
```tsx
{userSearchQuery 
  ? t('admin.noUsersFound') 
  : userFilterTab === 'pending'
    ? 'Brak użytkowników oczekujących na zatwierdzenie'
    : userFilterTab === 'active'
      ? 'Brak aktywnych użytkowników'
      : userFilterTab === 'blocked'
        ? 'Brak zablokowanych użytkowników'
        : t('admin.noUsers')
}
```

**2. Modyfikacja `src/components/admin/CompactUserCard.tsx`**

A) Zmiana tekstu przycisku (linie ~424-427):
```tsx
// Przed:
<DropdownMenuItem onClick={() => onToggleStatus(userProfile.user_id, userProfile.is_active)}>
  <Power className="w-4 h-4 mr-2" />
  {userProfile.is_active ? 'Dezaktywuj' : 'Aktywuj'}
</DropdownMenuItem>

// Po:
<DropdownMenuItem onClick={() => onToggleStatus(userProfile.user_id, userProfile.is_active)}>
  <Power className="w-4 h-4 mr-2" />
  {userProfile.is_active ? 'Zablokuj' : 'Odblokuj'}
</DropdownMenuItem>
```

B) Zmiana badge'a nieaktywnego (linie ~233-237):
```tsx
// Przed:
{!userProfile.is_active && (
  <Badge variant="destructive" className="text-xs h-5">
    Nieaktywny
  </Badge>
)}

// Po:
{!userProfile.is_active && (
  <Badge variant="destructive" className="text-xs h-5">
    Zablokowany
  </Badge>
)}
```

**3. Modyfikacja `src/components/admin/UserStatusLegend.tsx`**

Aktualizacja legendy (linia ~10):
```tsx
// Przed:
{ color: 'bg-gray-300', label: 'Nieaktywny', description: 'Konto dezaktywowane przez admina' },

// Po:
{ color: 'bg-gray-300', label: 'Zablokowany', description: 'Konto zablokowane przez admina' },
```

**4. Modyfikacja `src/pages/Admin.tsx` - komunikat toast**

Zmiana w funkcji `toggleUserStatus` (linia ~628):
```tsx
// Przed:
description: `Klient został ${!currentStatus ? 'aktywowany' : 'dezaktywowany'}.`,

// Po:
description: `Klient został ${!currentStatus ? 'odblokowany' : 'zablokowany'}.`,
```

---

## Podsumowanie zmian

| Plik | Zmiana |
|------|--------|
| `src/contexts/EditingContext.tsx` | **NOWY** - globalny kontekst edycji |
| `src/hooks/useFormProtection.ts` | **NOWY** - hook ochrony formularzy |
| `src/App.tsx` | Dodanie `EditingProvider` + `useSecurityPreventions` |
| `src/pages/Admin.tsx` | Nowa zakładka "Zablokowani", nowe filtry, zmiana komunikatów |
| `src/components/admin/CompactUserCard.tsx` | "Zablokuj/Odblokuj" zamiast "Dezaktywuj/Aktywuj" |
| `src/components/admin/UserStatusLegend.tsx` | Zmiana "Nieaktywny" na "Zablokowany" |
| Formularze admin (4 pliki) | Integracja `useFormProtection` |

---

## Oczekiwany rezultat

### Ochrona formularzy:
- Przełączanie kart przeglądarki nie resetuje otwartych formularzy
- Dane wpisane w formularze nie są tracone przy powrocie na kartę
- Subskrypcje realtime nie nadpisują edytowanych danych

### Zarządzanie użytkownikami:
- 4 zakładki: Oczekujący | Aktywni | Zablokowani | Wszyscy
- "Oczekujący" zawiera TYLKO tych, którzy czekają na zatwierdzenie
- "Zablokowani" zawiera TYLKO zablokowane konta (is_active=false)
- Przycisk "Zablokuj" zamiast "Dezaktywuj"
- Badge "Zablokowany" zamiast "Nieaktywny"
