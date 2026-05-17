## Problem

W mobilnym widoku rozmowy (`/messages`):
1. Tekst wpisywany w polu wiadomości jest niewidoczny — `<textarea>` w `MessageInput.tsx` ma `bg-transparent` bez jawnego koloru tekstu, więc na ciemnym tle dziedziczy zbyt słaby kontrast (a placeholder też jest ledwo widoczny).
2. W nagłówku rozmowy (`FullChatWindow.tsx`) widać tylko imię i nazwisko ("Dawid Kowalczyk") — brak roli odbiorcy (Lider / Partner / Specjalista / Klient / Admin) oraz brak kolorowego pierścienia roli przy awatarze.

## Zakres (tylko frontend / UI)

### 1) `src/components/unified-chat/MessageInput.tsx`
Dodać klasy zapewniające widoczność tekstu w `<textarea>` (linia ~151):
- dodać `text-foreground`
- dodać `placeholder:text-muted-foreground`
- (kontener `bg-muted/50` zostaje bez zmian)

### 2) `src/components/messages/FullChatWindow.tsx`
W nagłówku (linie 96–118):
- Zamienić zwykły `<Avatar>` na `RoleBadgedAvatar` (`size="sm"`) gdy mamy `directMember` — daje kolorowy pierścień roli + badge (czerwony shield dla admina, amber dla lidera itd.).
- Pod `displayName` dodać małą etykietę roli przez `ROLE_LABELS` z `@/types/roleChat`:
  - jeśli `directMember.role === 'partner' && directMember.isLeader` → "Lider"
  - w przeciwnym razie → `ROLE_LABELS[directMember.role]`
- Klasa etykiety: `text-xs text-muted-foreground leading-tight`.
- `displayName` zmienić na układ kolumnowy: `<div class="flex flex-col"><h3>...</h3><span>rola</span></div>`.

Brak zmian w logice wysyłania, danych, RLS, ani w `ChatHeader.tsx` (osobny komponent dla widgetu). Dla kanałów grupowych/rolowych (gdy `directMember` jest null) nie pokazujemy etykiety roli — nagłówek pozostaje jak dotychczas.

## Weryfikacja
- Wpisanie tekstu w polu — tekst i placeholder widoczne na ciemnym tle.
- Otwarcie rozmowy bezpośredniej — przy awatarze pierścień w kolorze roli + napis roli pod nazwiskiem.
