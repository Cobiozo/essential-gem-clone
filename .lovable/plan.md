

# Plan: 3 poprawki czatu — DM admina, czyszczenie danych, menu w PiP

## Problem 1: Wiadomości admina nie pojawiają się jako DM u odbiorcy

Gdy admin pisze do użytkownika B, wiadomość trafia do `role_chat_messages` z `recipient_id = B`. Jednak u użytkownika B ta konwersacja pojawia się **tylko** jeśli istnieje rekord w `admin_conversations`. Problem: użytkownik B widzi sekcję "Wiadomości prywatne" dopiero po reloadzie (realtime naprawiony w poprzednim kroku), ale kluczowe jest to, że wiadomości admina **nie pojawiają się w sekcji Team Members** u odbiorcy, bo admin nie jest w team/upline tego użytkownika — widoczne są **wyłącznie** w sekcji "Wiadomości prywatne" powiązanej z `admin_conversations`.

Aktualnie system działa poprawnie — admin DM trafia do sekcji "Wiadomości prywatne" z etykietą "💬 Wiadomość prywatna", nie do kanału broadcast. Jeśli użytkownik nie widzi konwersacji, to prawdopodobnie problem z: (a) brakiem rekordu w `admin_conversations`, lub (b) brakiem realtime (już naprawiony).

Zweryfikuję, czy `openConversation` jest wywoływany **przed** wysłaniem pierwszej wiadomości — bo w `handleSendMessage` w `ChatPanelContent` admin wywołuje `openConversation` tylko gdy `isAdmin` jest true, co tworzy rekord w `admin_conversations`. To powinno działać.

**Brak zmian w kodzie** — mechanizm jest poprawny. Wystarczy wyczyścić stare dane (punkt 2).

## Problem 2: Wyczyszczenie wszystkich konwersacji

Usunięcie danych z tabel:
- `role_chat_messages` — wszystkie wiadomości
- `admin_conversations` — wszystkie konwersacje admin-user
- `conversation_user_settings` — ustawienia (archiwizacja, blokada, usunięcie)

Wykonanie poprzez migrację SQL `TRUNCATE` na tych tabelach.

## Problem 3: Menu 3-kropek nie działa w trybie PiP

Okno PiP ma `z-index: 100`. Komponent `ConversationActions` używa `DropdownMenuContent` bez podwyższonego z-indexu — dropdown renderuje się **pod** oknem PiP i jest niewidoczny.

Analogicznie do rozwiązania w `MessageInput.tsx` (gdzie emoji picker i dialog mają `z-[200]`), trzeba dodać `className="z-[200]"` do `DropdownMenuContent` w `ConversationActions.tsx`, oraz do obu `AlertDialogContent`.

## Zmiany

### 1. Migracja SQL — czyszczenie danych czatu

```sql
TRUNCATE TABLE role_chat_messages;
TRUNCATE TABLE admin_conversations CASCADE;
TRUNCATE TABLE conversation_user_settings;
```

### 2. `src/components/messages/ConversationActions.tsx` — poprawka z-index

Dodać `className="z-[200]"` do:
- `DropdownMenuContent` (linia 63)
- Oba `AlertDialogContent` (linia 101 i 123) — dodać `className="z-[200]"` i odpowiedni overlay

## Pliki do edycji

| Plik | Zmiana |
|------|--------|
| Migracja SQL | TRUNCATE tabel czatu |
| `src/components/messages/ConversationActions.tsx` | z-[200] na DropdownMenuContent i AlertDialogContent |

