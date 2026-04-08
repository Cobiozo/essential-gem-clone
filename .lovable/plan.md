
Cel: poprawić czytelność zaznaczonej konwersacji oraz zapewnić natychmiastowe odświeżanie wiadomości bez ręcznego reloadu po obu stronach.

1. Zmiana stylu zaznaczonego elementu w sidebarze wiadomości
- Zastąpić obecne pełne wypełnienie tła dla zaznaczonej konwersacji subtelnym obramowaniem.
- Ujednolicić zaznaczenie w komponentach listy:
  - `src/components/messages/MessagesSidebar.tsx`
  - `src/components/messages/ChannelListItem.tsx`
  - `src/components/messages/TeamMemberItem.tsx`
- Docelowy wzorzec:
  - bez jaskrawego żółtego tła,
  - obramowanie `border border-primary/40` lub podobne,
  - delikatne tło neutralne albo brak tła,
  - zachować hover i dobrą czytelność tekstu.

2. Naprawa real-time dla wiadomości
- Problem w kodzie:
  - `useUnifiedChat` subskrybuje tylko wiadomości odbierane przez użytkownika, więc nadawca nie dostaje własnych eventów realtime.
  - subskrypcja nasłuchuje tylko `INSERT`, więc nie synchronizuje np. odczytów/usunięć.
  - w migracjach nie widać dodania `role_chat_messages` do `supabase_realtime`, więc eventy mogą w ogóle nie być emitowane.
- Do wdrożenia:
  - dodać migrację SQL w `supabase/migrations`, która bezpiecznie dopisze `public.role_chat_messages` do publikacji realtime,
  - przebudować subskrypcję w `src/hooks/useUnifiedChat.ts`, aby obejmowała:
    - wiadomości, gdzie użytkownik jest odbiorcą,
    - wiadomości, gdzie użytkownik jest nadawcą,
    - najlepiej event `*` zamiast samego `INSERT`.
- Handler realtime powinien:
  - odświeżać aktywną rozmowę direct po obu stronach,
  - odświeżać aktywny kanał broadcast po obu stronach,
  - aktualizować liczniki nieprzeczytanych,
  - odświeżać też po `UPDATE`, aby status odczytu/usunięcia był widoczny bez reloadu.

3. Zachowanie spójności z obecną architekturą
- Zostawić istniejące fetchery (`fetchDirectMessages`, `fetchMessages`, `fetchUnreadCounts`) i wykorzystać je w handlerze realtime zamiast przepisywać całą logikę.
- Zachować obecne optimistic update, ale oprzeć finalną synchronizację na eventach realtime z bazy.
- Dopilnować, by warunki odświeżania były zależne od aktualnie otwartej rozmowy/kanału, żeby nie robić zbędnych refetchy.

4. Zakres plików
- `src/hooks/useUnifiedChat.ts`
- `src/components/messages/MessagesSidebar.tsx`
- `src/components/messages/ChannelListItem.tsx`
- `src/components/messages/TeamMemberItem.tsx`
- nowa migracja w `supabase/migrations/...sql`

5. Efekt po wdrożeniu
- zaznaczona konwersacja będzie czytelna dzięki obramowaniu zamiast ostrego żółtego tła,
- nowa wiadomość pojawi się automatycznie bez odświeżania:
  - u nadawcy,
  - u odbiorcy,
  - w direct message i w kanałach,
- zmiany odczytu/usunięcia też będą widoczne od razu.

Sekcja techniczna
```text
Obecna luka realtime:
useUnifiedChat filter:
  recipient only
  -> sender-side events nie wpadają

Docelowo:
subscribe to role_chat_messages
  event: *
  refresh when:
    sender_id = currentUser
    OR recipient_id = currentUser
    OR broadcast to current role

Dodatkowo:
ALTER PUBLICATION supabase_realtime ADD TABLE public.role_chat_messages;
```
