
## Naprawa: Wydarzenia tworzone przez admina nie sa widoczne dla wszystkich

### Znaleziony blad

W plikach `WebinarForm.tsx` (linia 264) i `TeamTrainingForm.tsx` (linia 292), gdy admin tworzy nowe wydarzenie, ustawiany jest `host_user_id: user.id`:

```javascript
.insert({ ...webinarData, created_by: user.id, host_user_id: user.id });
```

Natomiast w `useEvents.ts` (linie 149-165) istnieje filtr widocznosci:

```javascript
if (!event.host_user_id) return true; // admin-created, no host = visible by roles
return event.host_user_id === user.id || myLeaderSet.has(event.host_user_id);
```

Komentarz w kodzie jasno mowi: "admin-created, no host = visible by roles". Ale poniewaz admin USTAWIA `host_user_id`, jego wydarzenia sa traktowane jak **wydarzenia lidera** -- widoczne TYLKO dla admina i jego downline, zamiast dla wszystkich zgodnie z flagami widocznosci (visible_to_partners, visible_to_clients itd.).

Ten sam problem dotyczy `usePublicEvents.ts`, ktory nie filtruje po `host_user_id`, wiec strony publiczne (webinary, szkolenia) dzialaja poprawnie. Natomiast **kalendarz** (useEvents) blednie ukrywa te wydarzenia.

### Rozwiazanie

Zmienic logike filtrowania w `useEvents.ts` tak, aby wydarzenia z `host_user_id` nalezacym do admina byly traktowane jak globalne (widoczne wg flag ról), a nie jak wydarzenia lidera.

Konkretnie, w bloku filtrowania (linia 161) dodac warunek: jesli host jest adminem, nie filtruj -- pokaz wszystkim zgodnie z rolami.

### Zmiana w pliku

**`src/hooks/useEvents.ts`** (linia ~159-164):

Przed:
```javascript
filteredEvents = filteredEvents.filter(event => {
  if (!['webinar', 'team_training'].includes(event.event_type)) return true;
  if (!event.host_user_id) return true;
  return event.host_user_id === user.id || myLeaderSet.has(event.host_user_id);
});
```

Po:
```javascript
// Determine which host IDs belong to admins (their events = global visibility)
const { data: adminHostIds } = await supabase.rpc('get_admin_host_ids', { p_host_ids: leaderEventHostIds });
const adminHostSet = new Set<string>(adminHostIds || []);

filteredEvents = filteredEvents.filter(event => {
  if (!['webinar', 'team_training'].includes(event.event_type)) return true;
  if (!event.host_user_id) return true;
  // Admin-hosted events are global (visible by role flags)
  if (adminHostSet.has(event.host_user_id)) return true;
  return event.host_user_id === user.id || myLeaderSet.has(event.host_user_id);
});
```

Alternatywne, prostsze rozwiazanie -- sprawdzac role hosta po stronie klienta bez dodatkowego RPC. Poniewaz juz mamy liste `leaderEventHostIds`, mozemy odwrocic logike: filtr dotyczy TYLKO hostow ktory sa w tabeli `leader_permissions`. Admin NIE jest w `leader_permissions`, wiec jego wydarzenia automatycznie przejda.

**Prostsze rozwiazanie (preferowane):**

Zamiast dodawac nowe RPC, zmienic filtr tak aby ograniczal widocznosc tylko do hostow z `leader_permissions`. Funkcja `get_user_leader_ids` zwraca TYLKO user_id ktore sa w `leader_permissions` -- admin tam nie jest. Wiec wystarczy zmiana warunku:

```javascript
filteredEvents = filteredEvents.filter(event => {
  if (!['webinar', 'team_training'].includes(event.event_type)) return true;
  if (!event.host_user_id) return true;
  // If host is NOT a known leader (e.g. admin), treat as global event
  if (!leaderEventHostIds.includes(event.host_user_id)) return true;
  return event.host_user_id === user.id || myLeaderSet.has(event.host_user_id);
});
```

Ale tu jest problem -- `leaderEventHostIds` to po prostu wszystkie `host_user_id` z events, wlacznie z adminem. Potrzebujemy wiedziec ktore z nich to prawdziwi liderzy.

**Ostateczne, najczystsze rozwiazanie:**

Wykorzystac istniejacy RPC `get_user_leader_ids`. Ten RPC sprawdza tabele `leader_permissions`. Admin NIE jest tam wpisany (nie jest liderem). Wiec `myLeaderSet` nigdy nie zawiera admin-host-id, ALE admin-host-id rowniez nie jest `user.id` dla zwyklego uzytkownika -- efekt: wydarzenie admina jest ukrywane.

Rozwiazanie: Pobrac oddzielnie liste "prawdziwych liderow" sposrod hostow, i filtrowac TYLKO te. Reszta (w tym admin) = globalna widocznosc.

### Ostateczny plan implementacji

1. **Nowa funkcja SQL** `filter_leader_user_ids(p_user_ids uuid[])` -- zwraca tylko te user_id z podanej listy, ktore istnieja w `leader_permissions`. Prosta, szybka, SECURITY DEFINER.

2. **Zmiana `useEvents.ts`** -- po pobraniu `leaderEventHostIds`, wywolac nowe RPC aby dowiedziec sie ktore z nich to prawdziwi liderzy. Tylko te filtrowac jako "leader events". Reszta (admin) = widoczna dla wszystkich wg flag.

### Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| Migracja SQL | Nowa funkcja `filter_leader_user_ids(uuid[])` |
| `src/hooks/useEvents.ts` | Wywolanie nowego RPC + zmieniona logika filtrowania |
