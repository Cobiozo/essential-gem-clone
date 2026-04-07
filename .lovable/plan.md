

# Ulepszenie systemu wiadomości — 3 zmiany

## 1. Załączniki: podgląd przed wysłaniem (nie auto-send)

**Problem**: Po wybraniu pliku w `MessageInput.tsx`, `handleMediaUploaded` natychmiast wywołuje `onSend()` — użytkownik nie ma kontroli.

**Rozwiązanie**: Dodać stan `pendingAttachment` (url, type, fileName) w `MessageInput`. Po uploaderze plik trafia do podglądu (miniaturka/ikona) obok pola tekstowego zamiast natychmiastowego wysłania. Użytkownik widzi podgląd z przyciskiem X (usunięcie) i może dodać tekst. Dopiero kliknięcie Send wysyła wiadomość z załącznikiem.

| Plik | Zmiana |
|------|--------|
| `src/components/unified-chat/MessageInput.tsx` | Dodanie stanu `pendingAttachment`, pasek podglądu załącznika z X do usunięcia, zmiana `handleMediaUploaded` aby ustawiał stan zamiast wysyłać, zmiana `handleSend` aby wysyłał z załącznikiem |

## 2. Układ wiadomości Messenger-style (prawo/lewo + kolory)

**Problem**: Wszystkie wiadomości są wyrównane do lewej z avatarem. Brak rozróżnienia wizualnego jak w Messengerze.

**Rozwiązanie**: W `MessageBubble` — wiadomości własne (`isOwn`) wyrównane do prawej (bez avatara, kolor np. `bg-amber-500/amber-600`), obce do lewej z avatarem (kolor `bg-muted`). Flex direction zmienia się w zależności od `isOwn`.

| Plik | Zmiana |
|------|--------|
| `src/components/unified-chat/MessageBubble.tsx` | Warunkowy layout: `flex-row-reverse` dla `isOwn`, ukrycie avatara dla własnych, zmiana koloru bąbelka własnych wiadomości na wyrazisty (np. amber/orange), wyrównanie tekstu nadawcy |

## 3. Usuwanie wiadomości z informacją "Wiadomość usunięta"

**Problem**: Brak możliwości usunięcia wiadomości w konwersacji.

**Rozwiązanie**: 
- Dodać pole `is_deleted` / `deleted_at` do tabeli wiadomości (migracja SQL)
- Przy long-press/hover na własnej wiadomości — opcja "Usuń" 
- Po usunięciu wiadomość nie znika, ale wyświetla się jako "Wiadomość została usunięta" (szary, kursywa) — tak jak w Messengerze
- Soft-delete: ustawienie flagi, treść ukryta w UI

| Element | Zmiana |
|---------|--------|
| Migracja SQL | Dodanie `is_deleted boolean default false`, `deleted_at timestamptz` do tabel wiadomości (`private_chat_messages`, `role_chat_messages`) |
| `src/components/unified-chat/MessageBubble.tsx` | Menu kontekstowe (hover) z opcją "Usuń" na własnych wiadomościach; render "Wiadomość została usunięta" gdy `is_deleted=true` |
| `src/hooks/useUnifiedChat.ts` | Dodanie `isDeleted` do `UnifiedMessage`, funkcja `deleteMessage` (soft-delete via update) |

