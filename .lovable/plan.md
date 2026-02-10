

# Naprawa detekcji Lidera w czacie

## Problem

Obecny kod sprawdza **tylko** `can_broadcast` aby oznaczyc partnera jako Lidera. Tymczasem Lider to partner, ktoremu admin przydzielil **dowolne** z uprawnien liderskich:
- `tripartite_meeting_enabled` (spotkania trojstronne)
- `partner_consultation_enabled` (konsultacje z partnerami)  
- `can_broadcast` (dostep do czatu broadcast)

## Zmiana

### Plik: `src/hooks/useUnifiedChat.ts`

W dwoch miejscach (team members ~linia 137 i messages ~linia 190) zmiana zapytania z:

```
.select('user_id, can_broadcast')
.eq('can_broadcast', true)
```

na:

```
.select('user_id, can_broadcast, tripartite_meeting_enabled, partner_consultation_enabled')
.or('can_broadcast.eq.true,tripartite_meeting_enabled.eq.true,partner_consultation_enabled.eq.true')
```

Dzieki temu kazdy partner posiadajacy **chociaz jedno** z tych uprawnien zostanie oznaczony zlota odznaka Lidera w czacie.

### Zakres zmian

- 1 plik: `src/hooks/useUnifiedChat.ts` — dwie edycje (fetchTeamMembers + fetchDirectMessages)
- Zadnych zmian w komponentach wizualnych — `RoleBadgedAvatar.tsx` dziala poprawnie, logika `isLeader` jest juz obslugiwana

