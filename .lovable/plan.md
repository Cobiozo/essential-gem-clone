

# Fix: Historia znika po zamknięciu + Messenger-like: Usuwanie, Archiwizacja, Blokowanie

## Problem 1: Historia znika u użytkownika po zamknięciu konwersacji
**Przyczyna**: W `useAdminConversations.ts` hook poprawnie zwraca zamknięte konwersacje, a sidebar je wyświetla. Ale `handleAdminSelectUser` dla non-admin wywołuje `selectDirectMember(userId)` — i to powinno działać. Prawdopodobny problem: użytkownik nie widzi konwersacji w sidebarze, bo `adminConversations` jest puste (problem z RLS lub fetchem). Trzeba dodać debug i upewnić się, że `onAdminSelectUser` jest przekazywane poprawnie dla non-admin.

**Fix**: W `MessagesSidebar.tsx` sekcja non-admin zależy od `onAdminSelectUser` — ale ta prop jest przekazywana jako `handleAdminSelectUser`. Problem może być w tym, że non-admin user nie ma konwersacji w `adminConversations` z powodu braku fetcha albo złego mapowania. Dodam dodatkowe zabezpieczenie: w `useAdminConversations` upewnię się że fetch działa poprawnie dla non-admin.

## Nowe funkcje (Messenger-style)

### Nowa tabela: `conversation_user_settings`
Przechowuje per-user ustawienia dla każdej konwersacji (usunięcie, archiwizacja, blokowanie).

```sql
CREATE TABLE public.conversation_user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  other_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_deleted boolean DEFAULT false,
  deleted_at timestamptz,
  is_archived boolean DEFAULT false,
  archived_at timestamptz,
  is_blocked boolean DEFAULT false,
  blocked_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, other_user_id)
);
-- RLS: users can only manage their own settings
```

### Logika działania (jak Messenger):
- **Usunięcie**: Ukrywa konwersację z listy (nie kasuje wiadomości z bazy). Jeśli druga osoba napisze ponownie, konwersacja pojawi się znowu.
- **Archiwizacja**: Przenosi do sekcji "Archiwum". Konwersacja wraca do głównej listy po nowej wiadomości.
- **Blokowanie**: Ukrywa konwersację + blokuje odbiór nowych wiadomości od tej osoby. Zablokowany użytkownik nie wie że jest zablokowany.

### Zmiany w plikach:

| Plik | Zmiana |
|------|--------|
| Migration SQL | Nowa tabela `conversation_user_settings` |
| `src/hooks/useConversationSettings.ts` | **NOWY** — CRUD dla delete/archive/block |
| `src/hooks/useAdminConversations.ts` | Fix: lepsze pobieranie konwersacji dla non-admin |
| `src/hooks/useUnifiedChat.ts` | Filtrowanie konwersacji po settings (deleted/archived/blocked) |
| `src/components/messages/ConversationActions.tsx` | **NOWY** — Menu kontekstowe (prawy klik / przycisk ⋮) z opcjami: Usuń, Archiwizuj, Zablokuj |
| `src/components/messages/MessagesSidebar.tsx` | Dodanie menu kontekstowego na konwersacjach + sekcja "Archiwum" |
| `src/components/messages/FullChatWindow.tsx` | Przycisk ⋮ w headerze z tymi samymi opcjami |
| `src/pages/MessagesPage.tsx` | Wire up conversation settings |

### UI/UX:
- Każda konwersacja na sidebarze: długie przytrzymanie (mobile) lub hover → ikona ⋮ → menu: "Usuń rozmowę", "Archiwizuj", "Zablokuj użytkownika"
- W headerze czatu: ikona ⋮ → te same opcje
- Na dole sidebara: link "Archiwum" (jeśli są zarchiwizowane konwersacje)
- Po zablokowaniu: potwierdzenie dialogowe "Czy na pewno chcesz zablokować?"
- Po usunięciu: toast "Konwersacja usunięta"

