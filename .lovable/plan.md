
Problem, który widać w kodzie, nie jest już po stronie samego zapisu `auto_webinar_granted_by`, tylko po stronie tego, co adminowi pokazujemy.

Plan naprawy:

1. Uporządkuję źródło danych w `AutoWebinarAccessManagement.tsx`
- Zamiast pobierać tylko użytkowników z rolą `partner`, rozszerzę listę o role objęte tym mechanizmem dostępu, przede wszystkim `partner` i `specjalista`.
- Dzięki temu admin zobaczy też osoby, którym lider nadał dostęp, ale nie są partnerami.

2. Poprawię prezentację informacji „kto komu nadał”
- Teraz nazwa lidera pojawia się tylko jako mały badge przy użytkownikach z dostępem.
- Zmienimy widok tak, by admin jednoznacznie widział:
  - komu nadano dostęp,
  - kto nadał dostęp,
  - bez chowania tej informacji w mało widocznym badge.
- Najprościej: dodać wyraźny opis pod nazwą użytkownika albo osobną kolumnę/sekcję „Nadane przez”.

3. Dodam rozróżnienie źródła nadania
- Jeśli `auto_webinar_granted_by` jest puste, a dostęp istnieje, UI pokaże jasną etykietę typu „Nadane przez administratora” zamiast ogólnego fallbacku „Lider”.
- Jeśli jest ustawione, pokażemy konkretne imię i nazwisko lidera.

4. Zweryfikuję zgodność z obecną logiką zapisu
- Lider zapisuje `auto_webinar_granted_by = auth.uid()` przez RPC `leader_update_auto_webinar_access`.
- Admin przy ręcznej zmianie ustawia `auto_webinar_granted_by: null`.
- Widok admina dopasuję dokładnie do tego modelu, żeby dane były interpretowane poprawnie.

5. Opcjonalne, ale zalecane usprawnienie
- Jeśli chcesz pełną historię „jaki lider i komu przydzielił dostęp”, obecne pole `auto_webinar_granted_by` pokazuje tylko ostatniego nadającego, a nie historię zmian.
- W kolejnym kroku warto dodać logowanie do `platform_team_actions` lub osobnej tabeli historii, np.:
  - lider,
  - użytkownik docelowy,
  - akcja grant/revoke,
  - data i godzina.
- To da adminowi prawdziwy rejestr działań, a nie tylko bieżący stan.

Pliki do zmiany:
- `src/components/admin/AutoWebinarAccessManagement.tsx` — rozszerzenie filtrowania ról i poprawa sposobu wyświetlania informacji o nadającym
- opcjonalnie później:
  - `src/components/leader/LeaderAutoWebinarAccessView.tsx`
  - `src/hooks/usePlatformTeamActions.ts`
  - nowa migracja SQL, jeśli mamy dodać pełną historię akcji

Szczegóły techniczne:
- Obecnie komponent robi:
  - `user_roles.eq('role', 'partner')`
  - to jest zbyt wąskie i może ukrywać część przypisań
- Obecnie admin widzi tylko stan końcowy z `leader_permissions.can_access_auto_webinar` + `auto_webinar_granted_by`
- To nie jest audyt logów, tylko snapshot aktualnego przypisania
- Jeśli wymaganie brzmi dokładnie „widzieć jaki lider i komu przydzielił dostęp”, warto wdrożyć 2 etapy:
  - etap 1: poprawny widok aktualnych przypisań,
  - etap 2: pełna historia przydzieleń i odebrań

Efekt po wdrożeniu etapu 1:
- admin zobaczy więcej właściwych użytkowników,
- przy każdym aktywnym dostępie zobaczy wyraźnie, kto go nadał,
- zniknie wrażenie, że system „nie pokazuje lidera”.

Efekt po wdrożeniu etapu 2:
- admin zobaczy także kiedy i komu lider nadał/odebrał dostęp, jako historię działań.
