

# Plan: Naprawienie duplikowania wiadomości w kanałach rozgłoszeniowych

## Problem

Gdy admin wysyła wiadomość do kanału "Partnerzy", kod tworzy **po jednym rekordzie w bazie na każdego partnera** (pętla `for (const targetUser of targetUsers)`). Następnie przy odczycie próbuje deduplikować po kluczu `content + created_at`, ale każdy INSERT ma nieco inny timestamp — więc deduplicacja nie działa i admin widzi N kopii tej samej wiadomości.

## Rozwiązanie

Zmienić architekturę: kanał rozgłoszeniowy = **jeden rekord** w bazie z `recipient_role` ustawionym na docelową rolę i `recipient_id = null`. Odbiorcy filtrują wiadomości po `recipient_role` pasującej do ich roli. Nie ma potrzeby tworzenia kopii per użytkownik.

## Zmiany

### 1. `src/hooks/useUnifiedChat.ts` — funkcja `sendMessage` (~linia 862)

Zastąpić pętle tworzące wiele rekordów jednym INSERT-em:

**Było (broadcast-partner):**
```typescript
const { data: targetUsers } = await supabase.from('profiles')...
for (const targetUser of (targetUsers || [])) {
  await supabase.from('role_chat_messages').insert({...recipient_id: targetUser.user_id...});
}
```

**Będzie:**
```typescript
// Jeden rekord broadcast — bez pętli
await supabase.from('role_chat_messages').insert({
  sender_id: user.id,
  sender_role: 'admin',
  recipient_role: targetRole,  // np. 'partner'
  recipient_id: null,          // broadcast = brak konkretnego odbiorcy
  content,
  channel_id: null,
  is_broadcast: true,
});
```

Ta sama zmiana dotyczy:
- `broadcast-all` → jeden INSERT z `recipient_role: 'all'` (zamiast 3 insertów)
- `broadcast-lider` → jeden INSERT z `recipient_role: 'lider'` (zamiast pętli po liderach)
- `broadcast-{role}` → jeden INSERT (zamiast pętli po użytkownikach)
- `leader-broadcast-{role}` → jeden INSERT z `sender_role: 'lider'` (zamiast pętli)

### 2. `src/hooks/useUnifiedChat.ts` — funkcja `fetchMessages` (~linia 708)

Uprościć zapytania dla kanałów wychodzących:
- Kanał `broadcast-all`: `sender_id = user.id AND recipient_role = 'all'` (bez zmian)
- Kanał `broadcast-{role}`: `sender_id = user.id AND recipient_role = {role}` (bez zmian)
- Kanał incoming `Od Administratora`: `sender_role = 'admin' AND (recipient_role = currentRole OR recipient_role = 'all')` — usunąć filtr `recipient_id` bo teraz jest null

Usunąć blok deduplicacji (linie 776-785) — nie będzie już potrzebny, bo jest jeden rekord per wiadomość.

### 3. Zapytania incoming — dostosowanie filtrów

Dla kanałów przychodzących (np. partner widzi "Od Administratora"):
```typescript
query = query
  .eq('sender_role', 'admin')
  .eq('is_broadcast', true)
  .or(`recipient_role.eq.${currentRole},recipient_role.eq.all`);
// Usunięto: .or(`recipient_id.eq.${user.id},recipient_id.is.null`)
// Bo teraz recipient_id jest zawsze null dla broadcastów
```

Dla "Od Lidera" (leader broadcast) — ta sama zasada: `recipient_role = currentRole AND sender_role = 'lider'`, bez filtra po `recipient_id`.

### 4. RLS — dostosowanie polityki SELECT

Aktualna polityka "Read own messages" wymaga `recipient_id = auth.uid()` lub `recipient_id IS NULL AND recipient_role = role`. Broadcast z `recipient_id = null` powinien już działać poprawnie dzięki warunkowi `recipient_id IS NULL AND recipient_role = user_role`. Weryfikacja potrzebna — jeśli warunek nie pokrywa `recipient_role = 'all'`, doda się go.

**Migracja SQL (jeśli potrzebna):**
```sql
DROP POLICY IF EXISTS "Read own messages" ON role_chat_messages;
CREATE POLICY "Read own messages" ON role_chat_messages
FOR SELECT USING (
  sender_id = auth.uid()
  OR recipient_id = auth.uid()
  OR (recipient_id IS NULL AND is_broadcast = true AND (
    recipient_role = get_user_role_name(auth.uid())
    OR recipient_role = 'all'
  ))
);
```

## Efekt

- Admin wysyła 1 wiadomość → 1 rekord w bazie → admin widzi 1 wiadomość
- Wszyscy partnerzy widzą tę samą wiadomość (filtr po `recipient_role`)
- Eliminacja zbędnych rekordów i pętli → lepsza wydajność
- Leader broadcast działa tak samo — 1 rekord zamiast N

## Pliki do edycji

| Plik | Zmiana |
|------|--------|
| `src/hooks/useUnifiedChat.ts` | Refactor `sendMessage` + `fetchMessages` — 1 INSERT zamiast pętli, usunięcie deduplicacji |
| Migracja SQL | Aktualizacja polityki RLS SELECT dla broadcastów |

