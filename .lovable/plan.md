

## Zachowanie timera + czyszczenie danych po zakonczeniu webinaru

### Problem 1: Timer i automatyczne konczenie

Po analizie kodu -- timer (`MeetingTimer`) jest juz **czysto informacyjny**. Nie wymusza zakonczenia spotkania. Po uplywie czasu pokazuje "overtime" (np. +2:30) i powiadamia hosta o kolizjach. Uczestnicy moga byc aktywni tak dlugo, az prowadzacy recznie kliknie "Zakoncz spotkanie". **Tu nie ma bledu -- zachowanie jest poprawne.**

Jedyny problem: po uplywie czasu uczestnicy nie dostaja zadnego komunikatu, ze czas spotkania minal. Warto dodac powiadomienie toast dla wszystkich uczestnikow (nie tylko hosta), gdy czas sie skonczy.

### Problem 2: Zbedne dane w bazie po zakonczeniu webinaru

Gdy prowadzacy konczy spotkanie (`handleEndMeeting`):
- Broadcast `meeting-ended` -> kazdy uczestnik wywoluje `handleLeave` -> `cleanup()` oznacza swojego uczestnika jako `is_active: false`
- **ALE**: jesli uczestnik zamknie przegladarke zanim cleanup sie wykona, jego rekord zostaje `is_active: true`
- Wiadomosci czatu (`meeting_chat_messages`) zostaja w bazie na 30 dni (CRON)
- Tokeny gosci (`meeting_guest_tokens`) nigdy nie sa czyszczone
- Analityka gosci (`meeting_guest_analytics`) z brakujacym `left_at` nigdy nie jest korygowana

**Rozwiazanie**: Dodac logike czyszczenia pokoju gdy host konczy spotkanie.

### Plan zmian

#### 1. Powiadomienie wszystkich uczestnikow o uplywie czasu
**Plik**: `src/components/meeting/MeetingTimer.tsx`
- Dodac nowy ref `notifiedEndRef` i toast dla WSZYSTKICH uczestnikow (nie tylko host/co-host) gdy `timeRemaining` przejdzie przez 0 (z pozytywnego na ujemny)
- Tresc: "Planowany czas spotkania minal. Spotkanie trwa do momentu zakonczenia przez prowadzacego."

#### 2. Czyszczenie danych pokoju przez hosta przy "Zakoncz spotkanie"
**Plik**: `src/components/meeting/VideoRoom.tsx`
- W `handleEndMeeting`, po broadcastie `meeting-ended`, dodac:
  1. Oznaczenie WSZYSTKICH uczestnikow pokoju jako `is_active: false, left_at: NOW()` (nie tylko swojego)
  2. Dezaktywacja tokenow gosci dla tego pokoju (`meeting_guest_tokens` -> `is_active: false`)
  3. Aktualizacja brakujacych `left_at` w `meeting_guest_analytics` dla tego pokoju

#### 3. Cleanup nieaktywnych tokenow gosci (CRON)
Dodac nowa funkcje DB `cleanup_expired_guest_tokens()` i zadanie CRON (np. co godzine) ktore:
- Dezaktywuje tokeny gosci starsze niz 24h ktore sa nadal aktywne
- Uzupelnia brakujace `left_at` w `meeting_guest_analytics` dla spotkań zakonczonych

### Szczegoly techniczne

**MeetingTimer.tsx -- powiadomienie o koncu czasu**:
```text
const notifiedEndRef = useRef(false);

// W useEffect timera:
if (timeRemaining <= 0 && !notifiedEndRef.current) {
  notifiedEndRef.current = true;
  toast({
    title: 'Czas spotkania minal',
    description: 'Spotkanie trwa do momentu zakonczenia przez prowadzacego.',
  });
}
```

**VideoRoom.tsx -- handleEndMeeting rozszerzony**:
```text
const handleEndMeeting = async () => {
  // 1. Broadcast zakonczenia
  if (channelRef.current) {
    try { await channelRef.current.send({ type: 'broadcast', event: 'meeting-ended', payload: {} }); } catch (e) {}
  }

  // 2. Oznacz wszystkich uczestnikow pokoju jako nieaktywnych
  try {
    await supabase.from('meeting_room_participants')
      .update({ is_active: false, left_at: new Date().toISOString() })
      .eq('room_id', roomId)
      .eq('is_active', true);
  } catch (e) { console.warn('[VideoRoom] Failed to deactivate all participants:', e); }

  // 3. Dezaktywuj tokeny gosci dla tego pokoju
  try {
    const { data: event } = await supabase
      .from('events')
      .select('id')
      .eq('meeting_room_id', roomId)
      .maybeSingle();
    if (event) {
      await supabase.from('meeting_guest_tokens')
        .update({ is_active: false })
        .eq('event_id', event.id)
        .eq('is_active', true);
    }
  } catch (e) { console.warn('[VideoRoom] Failed to deactivate guest tokens:', e); }

  // 4. Uzupelnij brakujace left_at w analityce gosci
  try {
    await supabase.from('meeting_guest_analytics')
      .update({ left_at: new Date().toISOString() })
      .eq('room_id', roomId)
      .is('left_at', null);
  } catch (e) { console.warn('[VideoRoom] Failed to update guest analytics:', e); }

  await handleLeave();
};
```

**Nowa migracja SQL -- CRON cleanup tokenow gosci**:
```text
CREATE OR REPLACE FUNCTION public.cleanup_expired_guest_tokens()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE cleaned integer;
BEGIN
  UPDATE meeting_guest_tokens
  SET is_active = false
  WHERE is_active = true
    AND created_at < NOW() - INTERVAL '24 hours';
  GET DIAGNOSTICS cleaned = ROW_COUNT;

  UPDATE meeting_guest_analytics
  SET left_at = NOW()
  WHERE left_at IS NULL
    AND joined_at < NOW() - INTERVAL '24 hours';

  RETURN cleaned;
END;
$$;

SELECT cron.schedule(
  'cleanup-expired-guest-tokens',
  '0 */6 * * *',
  $$SELECT public.cleanup_expired_guest_tokens()$$
);
```

### Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `src/components/meeting/MeetingTimer.tsx` | Toast dla wszystkich uczestnikow gdy czas minie |
| `src/components/meeting/VideoRoom.tsx` | Rozszerzenie `handleEndMeeting` o czyszczenie pokoju |
| Migracja SQL | Funkcja `cleanup_expired_guest_tokens` + CRON co 6h |

### Kryteria akceptacji

- Webinar NIE konczy sie automatycznie po uplywie czasu (juz dziala poprawnie)
- Wszyscy uczestnicy dostaja powiadomienie gdy czas minie
- Po zakonczeniu przez prowadzacego: wszyscy uczestnicy oznaczeni jako nieaktywni, tokeny gosci dezaktywowane, analityka uzupelniona
- CRON co 6h czyści osierocone tokeny gosci i brakujace left_at w analityce

