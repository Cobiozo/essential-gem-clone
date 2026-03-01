
# Auto-odświeżanie listy zablokowanych po akcji admina

## Problem
Gdy admin odblokuje użytkownika (np. sebastiansnopek210587), lider nadal widzi go jako zablokowanego, ponieważ dane w React Query cache nie są odświeżane. Brak subskrypcji realtime na tabeli `user_blocks`.

## Rozwiązanie
Dodać subskrypcję Supabase Realtime na tabelę `user_blocks` w hooku `useLeaderBlocks`. Gdy nastąpi zmiana (UPDATE/DELETE) w tabeli, automatycznie wywołać `invalidateQueries` co odświeży listę.

### Zmiana w `src/hooks/useLeaderBlocks.ts`

1. Dodać `useEffect` z subskrypcją realtime na tabelę `user_blocks`:
   - Nasłuchiwanie na zdarzenia `UPDATE` i `DELETE` (admin zmienia `is_active` na `false`)
   - Przy każdym zdarzeniu: `queryClient.invalidateQueries({ queryKey: ['leader-blocks'] })`
   - Cleanup: usunięcie kanału przy unmount

2. Zmniejszyć `staleTime` query do 30 sekund (fallback na wypadek gdyby realtime nie zadziałał)

### Kod zmiany

```typescript
// W useLeaderBlocks, po definicji useQuery:
useEffect(() => {
  if (!user) return;
  
  const channel = supabase
    .channel('leader-blocks-realtime')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'user_blocks',
    }, () => {
      queryClient.invalidateQueries({ queryKey: ['leader-blocks'] });
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [user, queryClient]);
```

### Wynik
- Gdy admin odblokuje użytkownika, lider zobaczy aktualizację w ciągu 1-2 sekund bez odświeżania strony
- Jeden plik do zmiany: `src/hooks/useLeaderBlocks.ts`
