

# Fix: Rozróżnienie wydarzeń tworzonych przez lidera vs admina

## Problem
Obecna logika filtruje wydarzenia na podstawie uprawnień hosta (`can_create_team_events` / `can_manage_team_training`), ale nie rozróżnia **kto utworzył** wydarzenie. Jeśli admin w CMS ustawi hosta na lidera z tymi uprawnieniami, wydarzenie i tak zostanie ograniczone do downline — a nie powinno.

## Reguła biznesowa
- **Lider tworzy w Panelu Lidera** (`created_by === host_user_id`) → widoczne tylko dla zespołu/downline
- **Admin tworzy w CMS** (`created_by !== host_user_id`, bo twórcą jest admin) → widoczne globalnie wg flag ról

## Zmiana

### Plik: `src/hooks/useEvents.ts` (linie ~167-185)

W filtrze downline dodać warunek: wydarzenie jest „leader-restricted" **tylko gdy** `created_by === host_user_id` (lider sam stworzył swoje wydarzenie). Jeśli twórcą jest ktoś inny (admin), traktuj jako globalne.

```typescript
// Build set of hosts who actually have team event permissions
// AND created the event themselves (leader panel)
const actualLeaderSet = new Set<string>(
  (leaderPerms || [])
    .filter(lp => lp.can_create_team_events === true || lp.can_manage_team_training === true)
    .map(lp => lp.user_id)
);

// w filtrze:
filteredEvents = filteredEvents.filter(event => {
  if (!['webinar', 'team_training'].includes(event.event_type)) return true;
  if (!event.host_user_id) return true;
  if (!actualLeaderSet.has(event.host_user_id)) return true;
  // KEY: only restrict if the leader created this event themselves
  if (event.created_by !== event.host_user_id) return true;
  // Leader-created event: show only to host, team, or registered
  return event.host_user_id === user.id || myLeaderSet.has(event.host_user_id) || event.is_registered;
});
```

Jedna linia dodana. Reszta logiki bez zmian.

## Efekt
- Szkolenie Techniczne utworzone przez admina z hostem = lider → widoczne dla wszystkich wg flag ról
- Szkolenie utworzone przez lidera w Panelu Lidera (created_by = host_user_id) → nadal ograniczone do downline

