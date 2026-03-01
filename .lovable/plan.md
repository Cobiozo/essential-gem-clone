

# Naprawienie widoczności przycisku "Zablokuj" przy członkach zespołu

## Problem
Przycisk blokowania w `OrganizationList.tsx` (linia 149) ma warunek:
```
node.role !== 'partner' && node.role !== 'admin'
```
Ponieważ wszyscy członkowie zespołu mają rolę "Partner", przycisk nigdy się nie wyświetla.

## Rozwiązanie
Zmienić warunek tak, aby przycisk blokowania pojawiał się przy **każdym członku zespołu** (level > 0), z wyjątkiem administratorów. Partnerzy powinni móc być blokowani przez lidera.

### Zmiana w pliku `src/components/team-contacts/organization/OrganizationList.tsx`

**Linia 149** — zmiana warunku z:
```typescript
{!isRoot && onBlockUser && node.role !== 'partner' && node.role !== 'admin' && (
```
na:
```typescript
{!isRoot && onBlockUser && node.role !== 'admin' && (
```

Usunięcie `node.role !== 'partner'` sprawi, że przycisk blokowania będzie widoczny przy partnerach, specjalistach i klientach — czyli przy każdym członku zespołu poza rootem (samym liderem) i adminami.

### Zmiana w RPC `leader_block_user` (migracja SQL)
Analogicznie w funkcji backendowej trzeba usunąć warunek blokujący partnerów. Obecnie:
```sql
IF v_target_role IN ('admin', 'partner') THEN
  RAISE EXCEPTION 'Cannot block admin or partner users';
END IF;
```
Zmienić na:
```sql
IF v_target_role = 'admin' THEN
  RAISE EXCEPTION 'Cannot block admin users';
END IF;
```

To dwie minimalne zmiany — jedna w froncie, jedna w bazie — które rozwiązują problem.
