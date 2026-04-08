

# Plan: Umożliwienie odpowiedzi na wiadomości admina (bypass hierarchii ról)

## Problem

Polityka RLS na tabeli `role_chat_messages` wymaga `can_send_to_role(sender_role, recipient_role)`, która sprawdza hierarchię ról:
- Admin (100) → Client (25) = **OK** (100 >= 25)
- Client (25) → Admin (100) = **BLOKADA** (25 < 100)

Koterski (client) nie może odpowiedzieć adminowi, bo baza danych odrzuca INSERT na poziomie RLS. Interfejs UI pozwala pisać (bo jest aktywna `admin_conversation`), ale wiadomość nie trafia do bazy.

## Rozwiązanie

Zmodyfikować politykę INSERT na `role_chat_messages`, aby oprócz hierarchii ról dopuszczała wysyłanie wiadomości gdy istnieje **aktywna konwersacja admina** (`admin_conversations` ze statusem `open`) między nadawcą a odbiorcą.

### Bezpieczeństwo

Aby uniknąć rekurencji RLS (tabela `admin_conversations` też ma RLS), użyjemy funkcji `SECURITY DEFINER` do sprawdzenia istnienia aktywnej konwersacji.

## Zmiany

### 1. Migracja SQL — nowa funkcja + aktualizacja polityki RLS

```sql
-- Funkcja SECURITY DEFINER sprawdzająca aktywną konwersację admin
CREATE OR REPLACE FUNCTION public.has_active_admin_conversation(
  _user_a uuid, _user_b uuid
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_conversations
    WHERE status = 'open'
    AND (
      (admin_user_id = _user_a AND target_user_id = _user_b)
      OR (admin_user_id = _user_b AND target_user_id = _user_a)
    )
  );
$$;

-- Zaktualizowana polityka INSERT
DROP POLICY "Send to lower or equal roles" ON role_chat_messages;
CREATE POLICY "Send to lower or equal roles" ON role_chat_messages
FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND sender_role = get_user_role_name(auth.uid())
  AND (
    can_send_to_role(sender_role, recipient_role) = true
    OR (
      recipient_id IS NOT NULL
      AND has_active_admin_conversation(auth.uid(), recipient_id)
    )
  )
);
```

### Efekt

- Admin → Koterski: działa (hierarchia ról OK)
- Koterski → Admin: działa (aktywna admin_conversation = bypass hierarchii)
- Admin zamyka konwersację → Koterski nie może już pisać (brak otwartej konwersacji + hierarchia blokuje)
- Inne pary ról: bez zmian — hierarchia obowiązuje

### Brak zmian w kodzie

Cała logika UI (recipientChatDisabled, checkRecipientChatAccess, admin bypass) jest już poprawna. Problem leżał wyłącznie w RLS.

| Element | Zmiana |
|---------|--------|
| Migracja SQL | Funkcja `has_active_admin_conversation` + nowa polityka INSERT |

