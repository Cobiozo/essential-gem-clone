

# Plan: Kanaly jednokierunkowe (broadcast) - poprawione kanaly lidera

## Poprawiony schemat komunikacji

```text
NADAWCY (jednokierunkowe - brak odpowiedzi)
============================================

ADMIN
  |---> Wszyscy
  |---> Liderzy
  |---> Partnerzy
  |---> Specjalisci
  |---> Klienci

LIDER (partner z can_broadcast=true)
  |---> Liderzy w mojej strukturze (sub-liderzy w downline)
  |---> Partnerzy w mojej strukturze
  |---> Specjalisci w mojej strukturze
  |---> Klienci w mojej strukturze
  (kazdy kanal filtruje TYLKO uzytkownikow z downline danego lidera)


ODBIORCY (tylko odczyt - nie moga odpowiadac)
==============================================

Lider:       "Od Admina"
Partner:     "Od Admina", "Od Lidera"
Specjalista: "Od Admina", "Od Lidera"
Klient:      "Od Admina", "Od Lidera"
```

---

## Zmiany w bazie danych

### Migracja SQL

```sql
ALTER TABLE leader_permissions 
  ADD COLUMN IF NOT EXISTS can_broadcast boolean DEFAULT false;

ALTER TABLE role_chat_messages 
  ADD COLUMN IF NOT EXISTS is_broadcast boolean DEFAULT false;
```

---

## Zmiany w kodzie

### 1. `src/types/roleChat.ts`

Dodanie etykiety "Lider":

```tsx
export const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrator',
  lider: 'Lider',
  partner: 'Partner',
  specjalista: 'Specjalista',
  client: 'Klient',
};
```

### 2. `src/hooks/useUnifiedChat.ts` - Przebudowa kanalow

**Kanaly nadawcze Admina (5 kanalow):**
- "Wszyscy" - broadcast do wszystkich
- "Liderzy" - partnerzy z `can_broadcast = true`
- "Partnerzy" - wszyscy partnerzy
- "Specjalisci" - wszyscy specjalisci
- "Klienci" - wszyscy klienci

**Kanaly nadawcze Lidera (4 kanaly, filtrowane po downline):**
- "Liderzy w strukturze" - sub-liderzy (partnerzy z `can_broadcast`) w downline
- "Partnerzy w strukturze" - partnerzy w downline
- "Specjalisci w strukturze" - specjalisci w downline
- "Klienci w strukturze" - klienci w downline

Przy wyborze kanalu np. "Specjalisci w strukturze":
1. Pobrac downline z `get_organization_tree`
2. Odfiltrowac tylko tych z `role = 'specjalista'`
3. Wyslac wiadomosc z `is_broadcast: true` do kazdego z nich (`recipient_id`)

**Kanaly odbiorcze (tylko odczyt):**
- Lider: "Od Admina"
- Partner: "Od Admina", "Od Lidera"
- Specjalista: "Od Admina", "Od Lidera"
- Klient: "Od Admina", "Od Lidera"

### 3. `src/components/messages/FullChatWindow.tsx`

Potwierdzenie blokady odpowiedzi na kanalach incoming - juz czesciowo istnieje w logice `canSend`. Upewnienie sie ze kanaly broadcast sa zawsze read-only.

### 4. Panel admin - przelacznik `can_broadcast`

W komponencie zarzadzania liderami dodanie przelacznika "Moze wysylac wiadomosci do zespolu" (`can_broadcast = true` w `leader_permissions`).

---

## Kluczowa roznica wzgledem poprzedniego planu

Poprzednio lider mial jeden kanal "Moj zespol" wysylajacy do calego downline. Teraz lider ma **4 oddzielne kanaly** filtrujace po roli w obrebie swojego downline, co daje mu precyzyjne kierowanie wiadomosci np. tylko do specjalistow w jego strukturze, bez zasmiecania klientow.

---

## Podsumowanie plikow do zmiany

| Plik | Zmiana |
|------|--------|
| Migracja SQL | `can_broadcast` w `leader_permissions`, `is_broadcast` w `role_chat_messages` |
| `src/types/roleChat.ts` | Etykieta "Lider" |
| `src/hooks/useUnifiedChat.ts` | Admin: 5 kanalow nadawczych. Lider: 4 kanaly nadawcze filtrowane po downline. Odbiorcy: "Od Admina" + "Od Lidera" |
| `src/components/messages/FullChatWindow.tsx` | Blokada odpowiedzi na kanalach broadcast |
| Panel admin | Przelacznik `can_broadcast` |

