
# System wizualnych odznak rol w czacie

## Cel

Dodanie kolorowych odznak przy awatarach w interfejsie czatu, rozrozniajacych 5 poziomow rol: Administrator, Lider, Partner, Specjalista, Klient.

## Nowy komponent: `src/components/chat/RoleBadgedAvatar.tsx`

Wspolny komponent wielokrotnego uzytku, renderujacy awatar z kolorowa obramowka i mala ikona roli w naroznym znaku:

| Rola         | Obramowka         | Ikona       | Kolor ikony        |
|-------------|-------------------|-------------|-------------------|
| Admin       | `ring-red-500`    | Shield      | czerwona           |
| Lider       | `ring-amber-500`  | Star        | zlota              |
| Partner     | `ring-orange-700` | Handshake   | brazowa            |
| Specjalista | `ring-blue-500`   | Wrench      | niebieska          |
| Klient      | `ring-green-500`  | User        | zielona            |

Komponent przyjmuje propsy: `role`, `isLeader?`, `avatarUrl?`, `initials`, `size` (sm/md).

Logika rozpoznawania Lidera: jesli `role === 'partner'` i `isLeader === true`, traktuj jako Lidera (zlota odznaka).

Struktura HTML:
```
<div className="relative">
  <Avatar className="ring-2 ring-{kolor_roli}">
    ...
  </Avatar>
  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-{kolor} flex items-center justify-center">
    <Icon className="w-2.5 h-2.5 text-white" />
  </div>
</div>
```

## Zmiany w istniejacych komponentach

### 1. `src/components/unified-chat/MessageBubble.tsx`
- Import `RoleBadgedAvatar`
- Zastapic obecny blok `<Avatar>` (linie 77-84) nowym komponentem
- Przekazac `message.senderRole` i `message.isLeader` (nowe pole)

### 2. `src/components/messages/TeamMemberItem.tsx`
- Import `RoleBadgedAvatar`
- Zastapic obecny blok `<Avatar>` (linie 30-35) nowym komponentem
- Przekazac `member.role` i ewentualnie `member.isLeader`

### 3. `src/hooks/useUnifiedChat.ts`

Rozszerzenie interfejsow:

**`UnifiedMessage`** — dodanie pola `isLeader?: boolean`

**`TeamMemberChannel`** — dodanie pola `isLeader?: boolean`

**Logika Lidera w wiadomosciach (`fetchDirectMessages`):**
- Po pobraniu profili nadawcow, sprawdzic w tabeli `leader_permissions` czy `can_broadcast === true` dla kazdego nadawcy
- Ustawic `isLeader: true` w danych wiadomosci

**Logika Lidera w czlonkach zespolu (`fetchTeamMembers`):**
- Przy pobieraniu downline, pobrac rowniez `leader_permissions` dla tych uzytkownikow
- Ustawic `isLeader: true` w `TeamMemberChannel` dla partnerow z uprawnieniami broadcast

## Responsywnosc

- Rozmiar `sm` (h-7 w-7, ikona w-3 h-3) dla listy czlonkow zespolu i wiadomosci
- Rozmiar `md` (h-9 w-9, ikona w-4 h-4) domyslny
- Obramowka `ring-2` — cienka, widoczna zarowno na desktop jak i mobile
- Ikona roli w naroznym kole ma staly rozmiar 16px — czytelna na kazdym urzadzeniu

## Wynik

- 1 nowy plik: `RoleBadgedAvatar.tsx`
- 3 pliki edytowane: `MessageBubble.tsx`, `TeamMemberItem.tsx`, `useUnifiedChat.ts`
- Kazdy uzytkownik w czacie ma wizualnie rozpoznawalna role — na pierwszy rzut oka
