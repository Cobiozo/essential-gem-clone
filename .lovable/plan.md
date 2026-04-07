

# Poprawki: toast, natychmiastowe wyświetlanie, realtime dla odbiorcy

## Problemy

### 1. Toast zasłania przyciski
`EmojiPicker` kopiuje do schowka + wyświetla toast. `VoiceRecorder` wyświetla toast "Sukces" po wysłaniu.

### 2. Spinner po wysłaniu wiadomości
`sendDirectMessage` (linia 308) wywołuje `fetchDirectMessages(recipientId)`, który ustawia `setLoading(true)` (linia 172) — widoczny spinner zamiast natychmiastowego tekstu.

### 3. Wiadomość nie pojawia się u odbiorcy w realtime
Krytyczny bug w realtime subscription (linia 994-1000): gdy przychodzi nowa wiadomość, handler sprawdza `selectedChannelId` i wywołuje `fetchMessages(selectedChannelId)`. Ale rozmowy 1:1 (DM) używają `selectedDirectUserId`, a `selectedChannelId` jest wtedy `null`. Dlatego handler nie odświeża wiadomości DM u odbiorcy. Brakuje odniesienia do `selectedDirectUserId` w logice realtime.

---

## Rozwiązanie

### Plik 1: `src/components/cms/EmojiPicker.tsx`
- Usunąć `navigator.clipboard.writeText()` i `toast()`
- `handleEmojiClick` tylko wywołuje `onEmojiSelect(emoji)` i ustawia `selectedEmoji`
- Usunąć nieużywane importy (`useToast`, `Copy`, `Check`, `copiedEmoji` state)

### Plik 2: `src/components/unified-chat/VoiceRecorder.tsx`
- Usunąć toast "Sukces" po wysłaniu (linia 144-147)
- Zachować toast błędu (potrzebny)

### Plik 3: `src/hooks/useUnifiedChat.ts`

**A) Optimistic update w `sendDirectMessage`** (linie 237-314):
- Po udanym insercie do bazy, natychmiast dodać wiadomość do `messages` state (optimistic) zamiast czekać na `fetchDirectMessages`
- Usunąć `await fetchDirectMessages(recipientId)` z `sendDirectMessage`

**B) Silent refresh w `fetchDirectMessages`** (linia 169-234):
- Dodać parametr `silent?: boolean`
- Gdy `silent=true`, nie ustawiać `setLoading(true)` — to pozwoli na ciche odświeżenie w tle

**C) Naprawić realtime dla DM** (linie 971-1008):
- Dodać ref `selectedDirectUserIdRef` (analogicznie do istniejących refów)
- W handlerze realtime: jeśli `selectedDirectUserIdRef.current` jest ustawiony, wywołać `fetchDirectMessagesRef.current(selectedDirectUserIdRef.current)` w trybie silent
- Dodać `selectedDirectUserId` do deps effect

### Plik 4: `src/hooks/useUnifiedChat.ts` — usunąć toast "Wiadomość wysłana" (linia 903)
- Usunąć `toast.success('Wiadomość wysłana')` z `sendMessage` (broadcast)

---

## Efekt końcowy
- Brak toastów zasłaniających UI
- Wiadomość pojawia się natychmiast po wysłaniu (optimistic update, bez spinnera)
- Wiadomość pojawia się natychmiast u odbiorcy (realtime subscription naprawiony dla DM)

