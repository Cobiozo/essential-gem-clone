

## Problem

Gdy lider tworzy wydarzenie (webinar/szkolenie) w Panelu Lidera, jest ono widoczne dla WSZYSTKICH uzytkownikow platformy w kalendarzu na pulpicie. Powinno byc widoczne TYLKO dla lidera i osob z jego zespolu (downline).

## Przyczyna

W `useEvents.ts` (linia 139-143), logika filtrowania pokazuje wszystkie wydarzenia typu `webinar` i `team_training` kazdemu uzytkownikowi:

```typescript
if (!['tripartite_meeting', 'partner_consultation'].includes(event.event_type)) {
  return true; // <-- team_training i webinar zawsze widoczne
}
```

Nie ma rozroznienia miedzy wydarzeniami utworzonymi przez admina (dla calej platformy) a wydarzeniami utworzonymi przez lidera (tylko dla zespolu).

## Dane w bazie

Analiza istniejacych danych pokazuje jasny wzorzec:
- **Admin-created events**: `host_user_id = NULL`, creator ma role `admin`
- **Leader-created events**: `host_user_id = leader's user_id`, creator ma role `partner`

Mozna to wykorzystac bez dodawania nowych kolumn.

## Plan rozwiazania

### 1. Nowa funkcja RPC: `is_user_in_team` (migracja SQL)

Stworzyc lekka funkcje sprawdzajaca czy dany uzytkownik jest w zespole lidera (downline). Funkcja rekurencyjnie sprawdzi lancuch `upline_eq_id`:

```sql
CREATE FUNCTION public.is_user_in_team(p_user_id uuid, p_leader_user_id uuid)
RETURNS boolean
```

Logika: pobierz `eq_id` lidera, a nastepnie sprawdz czy `p_user_id` ma w swoim lancuchu `upline_eq_id` (rekurencyjnie w gore) ten `eq_id`. Jesli tak, uzytkownik jest w zespole. Uzytkownik = lider tez zwraca `true`.

### 2. Zmiana w `useEvents.ts` - filtrowanie wydarzen liderskich

Po pobraniu wydarzen, dla kazdego wydarzenia typu `webinar` lub `team_training` ktore ma `host_user_id` ustawiony (czyli utworzone przez lidera):
- Pobrac liste `host_user_id` takich wydarzen
- Wywolac RPC `is_user_in_team` aby sprawdzic czy zalogowany uzytkownik nalezy do zespolu kazdego z tych liderow
- Odfiltrowac wydarzenia, do ktorych uzytkownik nie nalezy

Aby uniknac wielu wywolan RPC, stworzmy bardziej wydajna wersje: jedna funkcja RPC zwracajaca liste `leader_user_id`, do ktorych uzytkownik nalezy:

```sql
CREATE FUNCTION public.get_user_leader_ids(p_user_id uuid)
RETURNS SETOF uuid
```

Ta funkcja zwroci wszystkich liderow w lancuchu upline uzytkownika (od bezposredniego opiekuna az do korzenia drzewa). Dzieki temu wystarczy jedno wywolanie RPC na caly fetch.

### 3. Logika filtrowania (pseudokod)

```typescript
// Po pobraniu wydarzen, ale przed setEvents:

// Zbierz unikalne host_user_id z wydarzen liderskich
const leaderEventHostIds = parsedEvents
  .filter(e => ['webinar', 'team_training'].includes(e.event_type) && e.host_user_id)
  .map(e => e.host_user_id);

if (leaderEventHostIds.length > 0) {
  // Pobierz liste liderow, do ktorych zalogowany user nalezy
  const { data: myLeaderIds } = await supabase.rpc('get_user_leader_ids', { p_user_id: user.id });
  const myLeaderSet = new Set(myLeaderIds || []);
  
  // Filtruj: pokaz wydarzenie liderskie tylko jesli user jest hostem LUB nalezy do zespolu hosta
  filteredEvents = filteredEvents.filter(event => {
    if (!['webinar', 'team_training'].includes(event.event_type)) return true;
    if (!event.host_user_id) return true; // admin-created, brak hosta = widoczne wg rol
    // Liderskie wydarzenie: pokaz tylko jesli jestem hostem lub w jego zespole
    return event.host_user_id === user.id || myLeaderSet.has(event.host_user_id);
  });
}
```

### 4. Pliki do zmiany

- **Nowa migracja SQL**: funkcja `get_user_leader_ids(p_user_id uuid)` - zwraca liste user_id liderow w lancuchu upline uzytkownika (plus samego uzytkownika jesli jest liderem)
- **`src/hooks/useEvents.ts`**: dodanie filtrowania wydarzen liderskich na podstawie przynaleznosci zespolowej

### 5. Wazne szczegoly

- Funkcja RPC `get_user_leader_ids` bedzie `SECURITY DEFINER` aby miec dostep do profili niezaleznie od RLS
- Funkcja sprawdzi rekurencyjnie lancuch `upline_eq_id` i zwroci `user_id` kazdego partnera/lidera na drodze w gore (ktory ma wpis w `leader_permissions`)
- Dla admina: admin nie ma `host_user_id` na swoich wydarzeniach, wiec filtr go nie dotyczy
- Dla lidera: widzi swoje wydarzenia (jest hostem) + wydarzenia liderow nad soba
- Dla partnera/specjalisty: widzi wydarzenia swoich liderow w lancuchu upline

