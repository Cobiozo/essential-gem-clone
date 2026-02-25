
Cel: zatrzymać „miganie” uczestników (pojawia się/znika prowadzący), losowe wyrzucanie osób z listy oraz nerwowe przełączanie aktywnego mówcy/widoku w trakcie webinaru.

Diagnoza po przeglądzie kodu (najważniejsze):
1) W `VideoRoom.tsx` logika heartbeat/ghost-cleanup jest zbyt agresywna i działa po stronie każdego klienta:
- klient potrafi oznaczyć INNYCH uczestników jako `is_active=false` w tabeli `meeting_room_participants` (na podstawie lokalnej oceny „stale”),
- po 3 nieudanych reconnectach klient także oznacza zdalnego peera jako nieaktywnego.
To powoduje globalny efekt uboczny: jedna niestabilna przeglądarka potrafi „wyrzucić” prowadzącego dla wszystkich.

2) Heartbeat pomija aktualizację gdy karta jest ukryta (`document.hidden`), a próg stale to 90s — przy throttlingu mobilnym/desktopowym łatwo o fałszywe „zniknięcie”.

3) Heartbeat aktualizuje własny rekord z warunkiem `.eq('is_active', true)`, więc jeśli ktoś wcześniej ustawił rekord na `false`, klient może nie odzyskać obecności samym heartbeatem.

4) Watchdog kanału sygnalizacyjnego usuwa kanał, ale nie zawsze natychmiast go odtwarza — to pogłębia niespójność sygnałów.

5) W `VideoGrid.tsx` aktywny mówca przełącza się dość szybko (krótki debounce + niski próg), więc przy jitterze audio daje efekt „skaczącego” widoku.

Zakres zmian:
- Głównie `src/components/meeting/VideoRoom.tsx`
- Dodatkowo `src/components/meeting/VideoGrid.tsx` (stabilizacja active speaker)

Plan implementacji:

1) Usunąć klientowe „dezaktywowanie” innych uczestników
- W heartbeat/visibility sync usunąć fragmenty, które robią `update is_active=false` dla innych peerów.
- W `reconnectToPeer` po przekroczeniu limitu prób nie pisać do DB o zdalnym peerze; tylko lokalnie zamknąć połączenie i oznaczyć go jako „nieosiągalny” w UI.
Efekt: pojedynczy klient nie będzie mógł „wyrzucić” prowadzącego globalnie.

2) Zmienić heartbeat na self-healing własnej obecności
- Aktualizacja własnego rekordu ma ustawiać:
  - `is_active=true`,
  - `left_at=null`,
  - `updated_at=now`,
  - opcjonalnie `peer_id` = aktualny peer.
- Usunąć warunek `.eq('is_active', true)` z własnej aktualizacji.
Efekt: nawet jeśli rekord został błędnie oznaczony jako nieaktywny, klient sam go odtworzy.

3) Ograniczyć fałszywe ghost-removale lokalnie
- Zamiast natychmiastowego usuwania uczestnika z UI po pojedynczym „braku w active list”, wprowadzić lokalny licznik/bramkę (np. 2–3 kolejne cykle heartbeat) zanim participant zniknie.
- Dodatkowo: jeśli istnieje żywe połączenie WebRTC (`connectionState/iceConnectionState` nie jest failed/closed), nie usuwać od razu z UI.
Efekt: koniec „pojawia się i znika” przy chwilowych lagach DB/realtime.

4) Poprawić watchdog kanału sygnalizacyjnego
- Gdy heartbeat wykryje martwy kanał (`state` != joined/joining), uruchomić jawnie funkcję reconnect (a nie tylko remove i czekanie).
- Utrzymać jeden aktywny timer reconnect i blokadę przed wielokrotnym równoległym `setupSignalingChannel`.
Efekt: mniejsze okna utraty sygnałów i mniej niespójności.

5) Uspokoić przełączanie aktywnego mówcy (UX)
- W `VideoGrid.tsx` podnieść minimalny próg aktywności audio i wydłużyć „hold time” aktywnego mówcy (np. 2–3s zamiast szybkiego przełączania).
- Przełączać tylko gdy nowy mówca ma wyraźnie wyższy poziom (histereza), nie przy drobnych fluktuacjach.
Efekt: widok przestanie „przerzucać” mówcę co chwilę.

6) Twarde kryteria bezpieczeństwa stanu uczestników
- Źródła „opuszczenia spotkania”:
  - własny `beforeunload/leave`,
  - `peer-left` broadcast,
  - długotrwały brak sygnału + brak aktywnego połączenia (lokalnie, bez kasowania innych z DB).
- DB nie powinna być używana przez każdego klienta do agresywnego „moderowania” aktywności innych.

7) Plan testów po wdrożeniu
- Test 2–3 klientów: prowadzący + uczestnik + opcjonalnie gość.
- Symulacja słabego łącza/utrata sieci na jednym kliencie:
  - prowadzący nie znika pozostałym,
  - uczestnik nie „miga” na liście.
- Test przełączania karty/background na mobile i desktop:
  - brak masowego znikania po ~90s.
- Test aktywnego mówcy:
  - brak nerwowego skakania kafla.
- Test end-to-end całego webinaru (dołączenie, chwilowe zerwanie, powrót, wyjście).

Ryzyka i uwagi:
- Po ograniczeniu agresywnego cleanupu mogą dłużej wisieć „martwe” wpisy — to celowy trade-off na rzecz stabilności live; można je sprzątać bezpiecznie po dłuższym czasie po stronie serwera (scheduled cleanup), nie przez każdego klienta.
- Zmiany są kompatybilne z obecną architekturą PeerJS + Supabase Realtime i nie wymagają przebudowy całego flow.

Kolejność wdrożenia:
1. `VideoRoom.tsx`: usunięcie globalnych deaktywacji + self-healing heartbeat.
2. `VideoRoom.tsx`: watchdog reconnect kanału + łagodniejszy local prune.
3. `VideoGrid.tsx`: stabilizacja active speaker.
4. Testy end-to-end i korekta progów.
