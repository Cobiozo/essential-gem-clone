
# Plan: Rozbudowa systemu czatu WhatsApp-style

## Podsumowanie wymagań

1. **Członkowie zespołu** - Wyświetlanie osób z drzewa organizacji (downline) w sekcji czatu
2. **Emoji, załączniki, wiadomości głosowe** - Uruchomienie niedziałających funkcji w pasku wiadomości
3. **Widoczność per-użytkownik** - Możliwość przypisania widoczności czatu do konkretnego użytkownika niezależnie od roli

---

## Część 1: Członkowie zespołu

### Obecny stan
Sekcja `TeamMembersSection` już istnieje i jest renderowana w `MessagesSidebar.tsx`. Hook `useUnifiedChat` pobiera:
- `upline` - opiekun (poprzez `upline_eq_id`)  
- `teamMembers` - downline (poprzez `get_organization_tree` RPC)

### Problem do zdiagnozowania
Należy zweryfikować czy dane są poprawnie pobierane i wyświetlane. Jeśli sekcja się nie pokazuje, może to oznaczać:
- Brak `eq_id` w profilu użytkownika
- Brak osób w downline

### Zmiany
Brak zmian kodu - funkcjonalność powinna działać. Ewentualnie debugowanie jeśli nie działa.

---

## Część 2: Funkcje paska wiadomości

### 2.1 Emoji Picker ✨

**Plik:** `src/components/unified-chat/MessageInput.tsx`

**Zmiana:** Zintegrować istniejący `EmojiPicker` z `src/components/cms/EmojiPicker.tsx`

```tsx
import { EmojiPicker } from '@/components/cms/EmojiPicker';

// W komponencie - zamiast ikonki Smile:
<EmojiPicker 
  onEmojiSelect={(emoji) => setMessage(prev => prev + emoji)}
  trigger={
    <button className="...">
      <Smile className="h-5 w-5" />
    </button>
  }
/>
```

### 2.2 Załączanie plików 📎

**Pliki do modyfikacji:**
- `src/components/unified-chat/MessageInput.tsx`
- `supabase/migrations/` - nowa migracja

**Krok 1: Migracja bazy danych**
```sql
ALTER TABLE role_chat_messages 
ADD COLUMN message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'audio', 'file')),
ADD COLUMN attachment_url text,
ADD COLUMN attachment_name text;
```

**Krok 2: Komponent MediaUpload jako Popover**
```tsx
import { MediaUpload } from '@/components/MediaUpload';

// Przy kliknięciu Paperclip - otwarcie dialogu:
<Dialog>
  <DialogTrigger>
    <Paperclip className="h-5 w-5" />
  </DialogTrigger>
  <DialogContent>
    <MediaUpload 
      onMediaUploaded={(url, type) => {
        // Wyślij wiadomość z załącznikiem
        onSend({ type, attachmentUrl: url });
      }}
      allowedTypes={['image', 'video', 'document', 'audio']}
      compact
    />
  </DialogContent>
</Dialog>
```

**Krok 3: Aktualizacja `MessageBubble`**
Dodać renderowanie załączników:
- Obrazki: `<img>` z podglądem
- Wideo: `<video>` z kontrolkami
- Audio: `<audio>` z kontrolkami
- Dokumenty: link do pobrania

### 2.3 Nagrywanie głosowe 🎤

**Nowy plik:** `src/components/unified-chat/VoiceRecorder.tsx`

**Funkcjonalność:**
1. Web Audio API + MediaRecorder do nagrywania
2. Wizualizacja podczas nagrywania (czas, przycisk stop)
3. Podgląd przed wysłaniem
4. Upload do storage i wysłanie jako wiadomość audio

```tsx
// Pseudo-kod struktury:
const VoiceRecorder = ({ onRecordingComplete }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder.current = new MediaRecorder(stream);
    // ... konfiguracja
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorder.current?.stop();
    setIsRecording(false);
  };

  // UI: przycisk mikrofonu / pasek nagrywania
};
```

---

## Część 3: Widoczność per-użytkownik

### 3.1 Migracja bazy danych

**Nowa tabela:** `chat_user_visibility`

```sql
CREATE TABLE public.chat_user_visibility (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.chat_user_visibility ENABLE ROW LEVEL SECURITY;

-- Tylko admini mogą zarządzać
CREATE POLICY "Admins can manage"
ON public.chat_user_visibility FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Użytkownicy mogą odczytać własne ustawienie
CREATE POLICY "Users read own"
ON public.chat_user_visibility FOR SELECT TO authenticated
USING (user_id = auth.uid());
```

### 3.2 Rozbudowa ChatSidebarVisibilityCard

**Plik:** `src/components/admin/ChatSidebarVisibilityCard.tsx`

**Nowa sekcja pod rolami:**
- Wyszukiwarka użytkowników (Combobox z autocomplete)
- Lista użytkowników z indywidualnym ustawieniem
- Switch: "Widoczny" / "Ukryty" dla każdego użytkownika
- Przycisk usunięcia nadpisania (powrót do ustawień roli)

```tsx
// Nowy stan i funkcje:
const [userOverrides, setUserOverrides] = useState<UserOverride[]>([]);
const [searchQuery, setSearchQuery] = useState('');
const [searchResults, setSearchResults] = useState<Profile[]>([]);

// Sekcja UI:
<Card>
  <CardHeader>
    <CardTitle>Widoczność per użytkownik</CardTitle>
    <CardDescription>
      Nadpisz ustawienia roli dla konkretnych użytkowników
    </CardDescription>
  </CardHeader>
  <CardContent>
    {/* Wyszukiwarka */}
    <Combobox 
      onSelect={(userId) => addUserOverride(userId)} 
      placeholder="Szukaj użytkownika..."
    />
    
    {/* Lista nadpisań */}
    {userOverrides.map(override => (
      <div key={override.user_id}>
        <Avatar /><span>{override.name}</span>
        <Switch checked={override.is_visible} />
        <Button onClick={() => removeOverride(override.user_id)}>X</Button>
      </div>
    ))}
  </CardContent>
</Card>
```

### 3.3 Aktualizacja hooka widoczności

**Plik:** `src/hooks/useChatSidebarVisibility.ts`

**Logika:**
1. Najpierw sprawdź `chat_user_visibility` dla bieżącego `user_id`
2. Jeśli istnieje rekord → użyj `is_visible` stamtąd
3. Jeśli nie → sprawdź `chat_sidebar_visibility` dla roli

```tsx
const checkChatVisibility = async () => {
  // 1. Sprawdź per-user override
  const { data: userOverride } = await supabase
    .from('chat_user_visibility')
    .select('is_visible')
    .eq('user_id', userId)
    .maybeSingle();

  if (userOverride) {
    return userOverride.is_visible;
  }

  // 2. Fallback do role-based
  const roleField = `visible_to_${role}`;
  const { data: roleSettings } = await supabase
    .from('chat_sidebar_visibility')
    .select(roleField)
    .single();

  return roleSettings?.[roleField] ?? false;
};
```

---

## Pliki do modyfikacji

| Plik | Typ zmiany |
|------|------------|
| `supabase/migrations/XXXX_chat_attachments_user_visibility.sql` | Nowy |
| `src/components/unified-chat/MessageInput.tsx` | Modyfikacja |
| `src/components/unified-chat/VoiceRecorder.tsx` | Nowy |
| `src/components/unified-chat/MessageBubble.tsx` | Modyfikacja |
| `src/components/admin/ChatSidebarVisibilityCard.tsx` | Modyfikacja |
| `src/hooks/useChatSidebarVisibility.ts` | Modyfikacja |
| `src/hooks/useUnifiedChat.ts` | Modyfikacja (obsługa załączników) |
| `src/integrations/supabase/types.ts` | Aktualizacja typów |

---

## Priorytetyzacja

| Priorytet | Funkcjonalność | Złożoność |
|-----------|----------------|-----------|
| 🔴 Wysoki | Emoji picker (już gotowy komponent) | Niska |
| 🔴 Wysoki | Widoczność per-użytkownik | Średnia |
| 🟡 Średni | Załączniki (wymaga migracji + UI) | Wysoka |
| 🟡 Średni | Nagrywanie głosowe | Wysoka |
