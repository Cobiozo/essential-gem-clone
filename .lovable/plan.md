
# Audyt integracji wewnetrznych spotkan (WebRTC)

## Ocena ogolna: 7/10 -- Funkcjonalne, ale z istotnymi problemami

---

## PROBLEMY KRYTYCZNE

### 1. TURN server URL zawiera literowke
**Plik:** `supabase/functions/get-turn-credentials/index.ts` (linia 71)
**Problem:** URL `turn:a.]relay.metered.ca:80` zawiera `]` -- prawdopodobnie blad kopiowania. Powinno byc `turn:a.relay.metered.ca:80`.
**Skutek:** TURN relay nie dziala -- polaczenia P2P za NAT/firewall beda niestabilne lub niemozliwe.
**Priorytet:** KRYTYCZNY

### 2. `getClaims()` nie istnieje w Supabase JS SDK
**Plik:** `supabase/functions/get-turn-credentials/index.ts` (linia 30)
**Problem:** Metoda `supabase.auth.getClaims(token)` nie jest czescia oficjalnego API Supabase. Poprawna metoda to `supabase.auth.getUser(token)`.
**Skutek:** Edge function prawdopodobnie rzuca blad 401 dla kazdego zapytania. Fallback w `VideoRoom.tsx` (linia 63) maskuje to, uzywajac tylko STUN Google.
**Priorytet:** KRYTYCZNY

### 3. Brak Realtime na tabeli `meeting_room_participants`
**Problem:** Tabela `meeting_chat_messages` jest dodana do Supabase Realtime publication, ale `meeting_room_participants` -- nie. Panel uczestnikow nie aktualizuje sie w czasie rzeczywistym.
**Skutek:** Lista uczestnikow moze byc nieaktualna.
**Priorytet:** SREDNI

---

## PROBLEMY TYPOWANIA (TypeScript)

### 4. Masowe uzycie `as any` dla pol `use_internal_meeting` / `meeting_room_id`
**Pliki:** `EventCard.tsx`, `EventCardCompact.tsx`, `EventDetailsDialog.tsx`, `WebinarForm.tsx`, `TeamTrainingForm.tsx`
**Problem:** Pola `use_internal_meeting` i `meeting_room_id` istnieja w tabeli `events` i w `types.ts`, ale typ `Event` w `src/types/events.ts` (ktory rozszerza `DbEvent`) powinien je zawierac natywnie. Mimo to, w 7 plikach uzywane jest `(event as any).use_internal_meeting`.
**Skutek:** Brak bezpieczenstwa typow, mozliwe runtime bledy bez ostrzezenia kompilatora.
**Priorytet:** SREDNI

---

## PROBLEMY BEZPIECZENSTWA

### 5. RLS na `meeting_chat_messages` zbyt permisywne
**Problem:** Polityka SELECT pozwala kazdemu zalogowanemu uzytkownikowi czytac WSZYSTKIE wiadomosci czatu ze WSZYSTKICH pokojow (`auth.uid() IS NOT NULL`). Ponadto, role ustawiono na `{public}` zamiast `{authenticated}`.
**Poprawka:** Ograniczyc SELECT do wiadomosci z pokoju, w ktorym uzytkownik aktualnie uczestniczy (podobnie jak `meeting_room_participants`).
**Priorytet:** SREDNI

### 6. Edge function `get-turn-credentials` ma `verify_jwt = false` ale weryfikuje JWT recznie
**Problem:** Niespojnosc -- `config.toml` wylacza weryfikacje JWT, ale funkcja sprawdza token recznie. To jest poprawny wzorzec, ale uwaga na punkt nr 2 -- `getClaims()` prawdopodobnie nie dziala.
**Priorytet:** NISKI (poprawne podejscie, ale zalezy od naprawy #2)

---

## PROBLEMY LOGIKI BIZNESOWEJ

### 7. Brak czyszczenia starych uczestnikow
**Problem:** Jesli uzytkownik zamknie karte przegladarki bez wywolania `cleanup()`, jego rekord w `meeting_room_participants` pozostaje z `is_active = true` na zawsze.
**Poprawka:** Dodac CRON job lub TTL-based cleanup (np. ustawiac `is_active = false` po 2h braku aktywnosci).
**Priorytet:** SREDNI

### 8. Brak czyszczenia starych wiadomosci czatu
**Problem:** Tabela `meeting_chat_messages` nie ma mechanizmu usuwania starych wiadomosci. Z czasem moze rosnac nieograniczenie.
**Poprawka:** Dodac retencje (np. usuwanie wiadomosci starszych niz 30 dni).
**Priorytet:** NISKI

### 9. `canJoinSoon` nie jest zdefiniowany w EventCard
**Plik:** `EventCard.tsx` (linia 286)
**Problem:** Warunek `(isLive || canJoinSoon)` uzywa `canJoinSoon`, ktore moze nie byc zdefiniowane w kontekscie renderowania przyciskow.
**Priorytet:** NISKI (wymaga weryfikacji)

---

## PROBLEMY UX

### 10. ParticipantsPanel nie pokazuje statusu kamery zdalnych uczestnikow
**Problem:** Interfejs `RemoteParticipant` w `VideoRoom.tsx` nie zawiera `isCameraOff`. Panel uczestnikow pokazuje zawsze ikone kamery jako aktywna dla zdalnych uczestnikow.
**Priorytet:** NISKI

### 11. Lobby tworzy dwa strumienie kamery
**Problem:** `MeetingLobby` tworzy preview stream, potem go zatrzymuje, a `VideoRoom` tworzy nowy stream. Krotka przerwa w dostepie do kamery moze powodowac migniecie lub blad na niektorych urzadzeniach.
**Priorytet:** NISKI

---

## PODSUMOWANIE PRIORYTETOW

| # | Problem | Priorytet | Trudnosc naprawy |
|---|---------|-----------|------------------|
| 1 | Literowka w TURN URL (`]`) | KRYTYCZNY | Latwa (1 znak) |
| 2 | `getClaims()` nie istnieje | KRYTYCZNY | Latwa (zamiana na `getUser()`) |
| 3 | Brak Realtime na participants | SREDNI | Latwa (SQL) |
| 4 | Masowe `as any` zamiast typow | SREDNI | Srednia (refaktor typow) |
| 5 | RLS chat zbyt permisywne | SREDNI | Latwa (zmiana polityki) |
| 7 | Brak cleanup stale participants | SREDNI | Srednia (CRON/TTL) |
| 6 | verify_jwt niespojnosc | NISKI | -- |
| 8 | Brak retencji wiadomosci | NISKI | Latwa |
| 9 | canJoinSoon weryfikacja | NISKI | Latwa |
| 10 | Brak statusu kamery remote | NISKI | Srednia |
| 11 | Podwojny stream w lobby | NISKI | Srednia |

---

## REKOMENDACJA

Naprawy #1 i #2 sa krytyczne -- bez nich TURN/relay nie dziala, co oznacza ze polaczenia video dzialaja TYLKO w sieci lokalnej (gdzie STUN wystarczy). Za NAT-em lub firewallem spotkania beda niestabilne.

Czy chcesz, zebym naprawil wszystkie problemy, czy zaczac od krytycznych (#1, #2)?
