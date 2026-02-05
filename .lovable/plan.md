# Plan: Rozbudowa systemu czatu WhatsApp-style

## Status: ✅ ZAIMPLEMENTOWANE

### Zaimplementowane funkcjonalności:

1. **Emoji Picker** ✅
   - Zintegrowany istniejący `EmojiPicker` z `src/components/cms/EmojiPicker.tsx`
   - Popover otwierany po kliknięciu ikony uśmiechu
   - Emoji dodawane do treści wiadomości

2. **Załączanie plików** ✅
   - Migracja bazy danych: dodane kolumny `message_type`, `attachment_url`, `attachment_name` do `role_chat_messages`
   - Dialog z komponentem `MediaUpload` dla uploadu plików
   - Obsługa obrazów, wideo, audio, dokumentów
   - Renderowanie załączników w `MessageBubble`

3. **Nagrywanie głosowe** ✅
   - Nowy komponent `VoiceRecorder.tsx`
   - Web Audio API + MediaRecorder
   - Wizualizacja podczas nagrywania
   - Podgląd przed wysłaniem
   - Upload do storage jako wiadomość audio

4. **Widoczność per-użytkownik** ✅
   - Nowa tabela `chat_user_visibility` z RLS
   - Rozbudowany `ChatSidebarVisibilityCard` z wyszukiwarką użytkowników
   - Lista nadpisań z przełącznikami Widoczny/Ukryty
   - Hook `useChatSidebarVisibility` sprawdza najpierw per-user override

### Pliki zmodyfikowane:
- `supabase/migrations/` - nowa migracja
- `src/components/unified-chat/MessageInput.tsx`
- `src/components/unified-chat/VoiceRecorder.tsx` (nowy)
- `src/components/unified-chat/MessageBubble.tsx`
- `src/components/unified-chat/ChatWindow.tsx`
- `src/components/messages/FullChatWindow.tsx`
- `src/pages/MessagesPage.tsx`
- `src/components/admin/ChatSidebarVisibilityCard.tsx`
- `src/hooks/useChatSidebarVisibility.ts`
- `src/hooks/useUnifiedChat.ts`
