

# Plan: Automatyczne wykrywanie nowych konwersacji od admina (realtime)

## Problem

Gdy admin pisze do użytkownika B, tworzy się rekord w tabeli `admin_conversations`, ale hook `useAdminConversations` u użytkownika B **nie ma subskrypcji realtime** — pobiera dane tylko raz przy montowaniu. Dlatego użytkownik B nie widzi nowej konwersacji w sidebarze czatu ani na stronie /messages, dopóki nie odświeży strony.

## Rozwiązanie

Dodać subskrypcję realtime na tabelę `admin_conversations` w hooku `useAdminConversations`, aby automatycznie odświeżał listę konwersacji gdy:
- pojawi się nowy rekord (INSERT) — admin zainicjował rozmowę
- zmieni się status (UPDATE) — admin zamknął/otworzył konwersację

## Zmiany

### 1. `src/hooks/useAdminConversations.ts` — dodać realtime subscription

W `useEffect` przy montowaniu, obok `fetchConversations()`, dodać:

```typescript
const channel = supabase
  .channel('admin-conversations-realtime')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'admin_conversations',
  }, () => {
    fetchConversations();
  })
  .subscribe();

return () => { supabase.removeChannel(channel); };
```

Dzięki temu:
- Gdy admin napisze do partnera → w tabeli pojawi się INSERT → partner automatycznie zobaczy konwersację w sekcji „Wiadomości prywatne"
- Gdy admin zamknie konwersację → UPDATE → status zmieni się automatycznie u użytkownika

## Pliki do edycji

| Plik | Zmiana |
|------|--------|
| `src/hooks/useAdminConversations.ts` | Dodać subskrypcję realtime na `admin_conversations` |

## Co pozostaje bez zmian

- Logika sidebar (MessagesSidebar) — już poprawnie renderuje sekcję „Wiadomości prywatne" dla nie-adminów gdy `adminConversations.length > 0`
- RLS na `admin_conversations` — polityka `user_read_own` poprawnie pozwala target_user na odczyt swoich konwersacji
- Dźwięki powiadomień — `playMessageSound()` jest już wywoływany w realtime subscription `role_chat_messages`

