
# Fix: Odblokowanie przez admina nie aktualizuje widoku lidera

## Problem
Tabela `user_blocks` nie jest dodana do publikacji Supabase Realtime (`supabase_realtime`). Subskrypcja realtime w `useLeaderBlocks.ts` nasłuchuje, ale nigdy nie otrzymuje zdarzeń, bo tabela nie emituje zmian.

Dodatkowo, w widoku "Struktura" u lidera (`OrganizationList`), po odblokowaniu przez admina, drzewo organizacji nie odświeża się automatycznie - użytkownik nadal widnieje jako "Zablokowany".

## Rozwiązanie

### 1. Migracja SQL - Włączenie Realtime dla tabeli `user_blocks`
Dodanie tabeli `user_blocks` do publikacji `supabase_realtime`:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE user_blocks;
```

Opcjonalnie dodanie tabeli `profiles` do realtime (jeśli jeszcze nie jest), aby zmiany `is_active` odświeżały drzewo organizacji:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
```

### 2. Dodanie subskrypcji realtime na `profiles` w `useOrganizationTree.ts`
Aby drzewo organizacji odświeżało się automatycznie po zmianie `is_active` w profilu (gdy admin odblokuje), dodać `useEffect` z subskrypcją na tabelę `profiles` - invalidacja `organization-tree` query przy zmianach.

### Kolejność
1. Migracja SQL (włączenie Realtime)
2. Aktualizacja `useOrganizationTree.ts` (subskrypcja realtime na profiles)

### Wynik
- Admin odblokuje użytkownika -> lider widzi zmianę w "Zablokowani" w ciągu 1-2 sekund
- Drzewo organizacji automatycznie odświeża status "Zablokowany" / aktywny
- Brak potrzeby ręcznego odświeżania strony
