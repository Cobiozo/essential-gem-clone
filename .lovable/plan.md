
# Blokowanie uzytkownikow przez lidera z zakladka "Zablokowani"

## Opis funkcjonalnosci

Lider moze zablokowac dostep czlonkowi swojego zespolu z poziomu "Moja struktura" w Panelu Lidera. Zablokowany uzytkownik pojawia sie w:
1. Nowej zakladce **"Zablokowani"** w Panelu Lidera (lider widzi tylko swoich zablokowanych)
2. Istniejacej zakladce **"Zablokowani"** w CMS admina (z adnotacja kto zablokowal i kiedy)

Admin moze odblokowac kazdego, lider tylko tych ze swojego zespolu ktorych sam zablokowal.

---

## Zmiany w bazie danych

### Nowa tabela: `user_blocks`

```text
user_blocks
- id: uuid PK
- blocked_user_id: uuid (ref profiles.user_id, ON DELETE CASCADE)
- blocked_by_user_id: uuid (ref profiles.user_id, ON DELETE SET NULL)
- blocked_by_first_name: text
- blocked_by_last_name: text
- reason: text (nullable)
- blocked_at: timestamptz (default now())
- unblocked_at: timestamptz (nullable)
- unblocked_by_user_id: uuid (nullable)
- is_active: boolean (default true) -- true = aktywna blokada
```

### Nowa funkcja RPC: `leader_block_user`
- Weryfikuje ze wywolujacy jest liderem i blokowany jest w jego zespole (downline)
- Ustawia `profiles.is_active = false` 
- Wstawia rekord do `user_blocks`
- Wysyla powiadomienie do admina

### Nowa funkcja RPC: `leader_unblock_user`
- Weryfikuje ze wywolujacy jest liderem i sam zablokowal tego uzytkownika, LUB jest adminem
- Ustawia `profiles.is_active = true`
- Oznacza blokade jako `is_active = false`, `unblocked_at`, `unblocked_by_user_id`

### Polityki RLS na `user_blocks`
- SELECT: admin widzi wszystko, lider widzi blokady ze swojego zespolu
- INSERT/UPDATE: tylko przez RPC (SECURITY DEFINER)

---

## Zmiany w kodzie frontendowym

### 1. Nowy hook: `src/hooks/useLeaderBlocks.ts`
- Pobiera aktywne blokady z `user_blocks` gdzie `blocked_by_user_id = current_user`
- Mutacje: `blockUser(userId, reason?)` i `unblockUser(blockId)`
- Korzysta z nowych funkcji RPC

### 2. Modyfikacja OrganizationList (lista struktury)
**Plik:** `src/components/team-contacts/organization/OrganizationList.tsx`

- Komponent `ListNode` otrzyma opcjonalny callback `onBlockUser`
- Przy kazdym czlonku zespolu (level > 0) pojawi sie przycisk "Zablokuj dostep" (ikona Ban/ShieldX)
- Klikniecie otwiera dialog potwierdzenia z opcjonalnym powodem

### 3. Modyfikacja LeaderOrgTreeView
**Plik:** `src/components/leader/LeaderOrgTreeView.tsx`

- Przekazuje `onBlockUser` do `OrganizationList`
- Integruje hook `useLeaderBlocks`

### 4. Nowy komponent: `src/components/leader/LeaderBlockedUsersView.tsx`
- Wyswietla liste zablokowanych uzytkownikow przez tego lidera
- Przycisk "Przywroc dostep" przy kazdym

### 5. Nowa zakladka w LeaderPanel
**Plik:** `src/pages/LeaderPanel.tsx`

- Nowy tab "Zablokowani" (ikona ShieldX) — widoczny zawsze gdy lider ma `can_view_org_tree`
- Renderuje `LeaderBlockedUsersView`

### 6. Modyfikacja CMS admina — zakladka "Zablokowani"
**Plik:** `src/pages/Admin.tsx`

- W filtrze `userFilterTab === 'blocked'` dodac informacje z tabeli `user_blocks`:
  - "Zablokowany przez: [imie nazwisko lidera], [data godzina]"
- Przycisk "Przywroc" obok kazdego zablokowanego uzytkownika (admin moze odblokowac kazdego)
- Jesli blokada pochodzi od lidera, wyswietlic adnotacje

### 7. Nowy permission flag (opcjonalny)
Zamiast osobnej flagi, funkcjonalnosc bedzie powiazana z istniejacym `can_view_org_tree` — jesli lider widzi strukture, moze blokowac czlonkow.

---

## Logika bezpieczenstwa
- Blokowanie jest mozliwe TYLKO dla uzytkownikow w downline lidera (weryfikacja przez `get_organization_tree`)
- Lider NIE moze zablokowac admina ani innego lidera
- Lider moze odblokowac TYLKO uzytkownikow ktorych SAM zablokowal
- Admin moze odblokowac KAZDEGO
- Wszystkie operacje przez SECURITY DEFINER RPC (nie bezposrednie zapytania)

---

## Kolejnosc wdrozenia
1. Migracja bazy: tabela `user_blocks` + RPC + RLS
2. Hook `useLeaderBlocks`
3. Przycisk blokowania w `OrganizationList` / `LeaderOrgTreeView`
4. Zakladka "Zablokowani" w Panelu Lidera
5. Adnotacje w zakladce "Zablokowani" w CMS admina
