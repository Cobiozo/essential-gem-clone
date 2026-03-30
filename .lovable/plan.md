

# Real-time czat gości auto-webinaru

## Co się zmieni

Goście oglądający ten sam slot będą widzieć:
1. **Fake messages** (od admina) — bez zmian, pojawiają się wg `appear_at_minute`
2. **Wiadomości innych gości** — nowe, synchronizowane w real-time przez Supabase Realtime

Cała reszta auto-webinaru (wideo, countdown, tracking, fikcja "na żywo", powiadomienia, RLS) pozostaje nienaruszona.

## Zmiany

### 1. Migracja SQL
- Dodać kolumnę `slot_time TEXT` do `auto_webinar_guest_messages` (izolacja wiadomości per slot)
- Dodać politykę RLS SELECT dla anon na `auto_webinar_guest_messages`
- Włączyć Realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE auto_webinar_guest_messages`

### 2. Hook `useAutoWebinarFakeChat.ts`
- Przyjąć nowy parametr `slotTime`
- Przy montowaniu: fetch istniejących wiadomości gości z tego samego `config_id` + `slot_time`
- Subskrybować Realtime INSERT na `auto_webinar_guest_messages` filtrowany po `config_id`
- Nowe wiadomości od innych gości (inny `guest_email`) dodawać do `visibleMessages`
- Przy wysyłaniu: dopisywać `slot_time` do insertu

### 3. `AutoWebinarEmbed.tsx`
- Przekazać `slotTime` (string `YYYY-MM-DD_HH:MM`) do komponentu `AutoWebinarFakeChat`

### 4. `AutoWebinarFakeChat.tsx`
- Przekazać `slotTime` do hooka

### Pliki do zmiany
| Plik | Zmiana |
|------|--------|
| Nowa migracja SQL | kolumna, RLS, Realtime |
| `src/hooks/useAutoWebinarFakeChat.ts` | fetch + subscribe + slot_time w insert |
| `src/components/auto-webinar/AutoWebinarEmbed.tsx` | przekazać slotTime |
| `src/components/auto-webinar/AutoWebinarFakeChat.tsx` | przekazać slotTime do hooka |

### Co NIE zmienia się
- Synchronizacja wideo, countdown, fazy
- Fake messages (timeline admina)
- Tracking obecności
- Powiadomienia email
- RLS na pozostałych tabelach
- Fikcja "na żywo" (badge, participants count)
- Player controls

