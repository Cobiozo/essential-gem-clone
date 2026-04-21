
# Fix duplikatów konwersacji + EQID jako disambiguator

## Główna naprawa (jak poprzednio)
1. **`useAdminConversations.ts`** — filtrować `fetchConversations` do moich rozmów (`.or(admin_user_id.eq.${user.id},target_user_id.eq.${user.id})`), poprawnie mapować drugiego rozmówcę, deduplikować po `userId`.
2. **`useAdminConversations.ts`** — `openConversation`: blokada self-chat + dwukierunkowy lookup istniejącej rozmowy.
3. **Migracja DB** — usunąć self-conversation Dawid→Dawid, dodać `CHECK (admin_user_id <> target_user_id)`.
4. **`MessagesSidebar.tsx`** — defensywna deduplikacja po `userId` przed renderem.

## Nowy element: EQID jako disambiguator dla identycznych nazwisk

### Cel
Gdy w bazie istnieje dwóch różnych użytkowników o tym samym imieniu i nazwisku (np. dwóch "Dawid Kowalczyk"), pokazać ich EQID drobnym fontem pod nazwą — żeby dało się ich rozróżnić. Dla użytkowników bez kolizji EQID nie musi być pokazywane (lub może być pokazywane zawsze, dla spójności).

### Co zmienić

**`useAdminConversations.ts`**
- W zapytaniu o profile dobrać kolumnę `eq_id`:
  ```ts
  .select('user_id, first_name, last_name, role, email, avatar_url, eq_id')
  ```
- Dodać pole `eqId: string | null` do interfejsu `AdminConversationUser` i mapowania.

**`src/components/messages/AdminConversationItem.tsx`** (lub komponent renderujący wpis konwersacji admina — sprawdzę dokładną nazwę)
- Pod nazwą użytkownika dodać linię:
  ```tsx
  {eqId && (
    <span className="text-[10px] text-muted-foreground/70 font-mono">
      {eqId}
    </span>
  )}
  ```
- Stylowanie: bardzo małe (`text-[10px]` lub `text-xs`), wyciszone (`text-muted-foreground/70`), monospace dla czytelności kodu.

**`TeamMemberItem.tsx`** — już pokazuje `member.eqId` po kropce w roli, więc jest spójnie. Można ujednolicić styl (drobna kursywa pod nazwą zamiast po roli) — ale tylko jeśli chcesz wymusić spójność wszędzie.

### Opcjonalne ulepszenie (do decyzji)
Pokazywać EQID **tylko gdy występuje konflikt nazwy** na liście (czyli gdy 2+ osoby mają identyczne `firstName + lastName`). Zaleta: czystszy UI dla unikalnych nazwisk. Wada: dodatkowa logika obliczania duplikatów w komponencie.

**Rekomendacja**: pokazywać EQID **zawsze** (drobnym fontem) — prościej, spójniej, użytkownik szybciej uczy się rozpoznawać po EQID.

## Dodatkowa notatka: Logo dla HC (Health Conversation)

W kontekście logo **EQology Independent Business Partner** obok tytułu w oknie rejestracji gości:
- Dla **Business Opportunity (BO)** — logo wyświetla się obok tytułu "Business Opportunity"
- Dla **Health Conversation (HC)** — to samo logo ma się wyświetlać obok tytułu "Health Conversation" (analogicznie jak dla BO)

Zmiana w `src/pages/EventGuestRegistration.tsx`:
- Rozszerzyć warunek wyświetlania logo z:
  ```tsx
  {isAutoWebinar && autoWebinarCategory === 'business_opportunity' && (...)}
  ```
  na:
  ```tsx
  {isAutoWebinar && (autoWebinarCategory === 'business_opportunity' || autoWebinarCategory === 'health_conversation') && (...)}
  ```
- Alternatywnie: wyświetlać logo dla wszystkich auto-webinarów (jeśli Eqology IBP dotyczy wszystkich kategorii).

## Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `src/hooks/useAdminConversations.ts` | Filtr moich rozmów + dedup + self-guard + dwukierunkowy lookup + dobranie `eq_id` |
| `src/components/messages/MessagesSidebar.tsx` (i AdminConversationItem) | Defensywna dedup + render EQID drobnym fontem |
| `src/types` (interfejs `AdminConversationUser`) | Dodać `eqId` |
| Migracja SQL | DELETE self-conversation + CHECK constraint |
| `src/pages/EventGuestRegistration.tsx` | Rozszerzyć warunek logo na HC (opcjonalnie, jeśli wymagane) |

## Efekt
- Każdy użytkownik **dokładnie raz** na liście
- Dwóch "Dawid Kowalczyk" rozróżnialnych po EQID widocznym drobnym fontem pod nazwą
- Brak self-konwersacji (technicznie zablokowane)
- Brak cudzych konwersacji w panelu
- Logo EQology IBP widoczne dla BO i HC w rejestracji gości
