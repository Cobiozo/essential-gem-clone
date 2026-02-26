

## Problem

1. **RLS blokuje zapis**: Polityka INSERT na tabeli `events` pozwala tylko adminom (`check_is_admin_for_events()`) lub na typy `tripartite_meeting`/`partner_consultation`. Lider probujacy dodac `webinar` lub `team_training` dostaje blad "new row violates row-level security policy".

2. **Formularz jest uproszczony**: Obecny `LeaderEventsView` ma prosty formularz (tytul, opis, daty, zoom, lokalizacja), podczas gdy admin ma rozbudowane formularze `WebinarForm` i `TeamTrainingForm` z wieloma dodatkowymi polami (typ webinaru, czas trwania, widocznosc, obraz, przyciski, konfiguracja rejestracji, przypomnienia SMS/email itd.).

## Rozwiazanie

### Krok 1: Dodanie polityki RLS dla liderow

Nowa polityka na tabeli `events` pozwalajaca liderom z uprawnieniem `has_team_events` na INSERT/UPDATE/DELETE wydarzen typu `webinar` i `team_training` gdzie sa hostem:

```sql
CREATE POLICY "leaders_manage_team_events"
ON public.events
FOR ALL
TO authenticated
USING (
  auth.uid() = host_user_id
  AND event_type IN ('webinar', 'team_training')
  AND EXISTS (
    SELECT 1 FROM public.leader_permissions
    WHERE user_id = auth.uid()
    AND has_team_events = true
  )
)
WITH CHECK (
  auth.uid() = host_user_id
  AND event_type IN ('webinar', 'team_training')
  AND EXISTS (
    SELECT 1 FROM public.leader_permissions
    WHERE user_id = auth.uid()
    AND has_team_events = true
  )
);
```

### Krok 2: Przebudowa LeaderEventsView

Zastapienie uproszczonego formularza reuzyciem istniejacych komponentow admina:

- Import `WebinarForm` i `TeamTrainingForm` z `src/components/admin/`
- Widok glowny: lista wydarzen lidera (bez zmian)
- Po kliknieciu "Nowe wydarzenie" -> wybor typu (webinar vs szkolenie) -> otwarcie odpowiedniego formularza admina
- Formularze admina juz zawieraja pelna logike zapisu do Supabase z `host_user_id = user.id` i `created_by = user.id`
- Dodanie logowania akcji do `platform_team_actions` po zapisie (w callbacku `onSave`)

### Struktura UI

```text
LeaderEventsView
+-- Lista wydarzen lidera (jak dotychczas)
+-- Przycisk "Nowe wydarzenie"
    +-- Dialog wyboru typu: [Webinar] [Szkolenie zespolowe]
        +-- WebinarForm (pelny formularz admina)
        +-- LUB TeamTrainingForm (pelny formularz admina)
+-- Edycja: klik Pencil -> odpowiedni formularz na podstawie event_type
```

### Zmiany w plikach

**Modyfikowane pliki:**
- `src/components/leader/LeaderEventsView.tsx` - przebudowa z reuzyciem `WebinarForm`/`TeamTrainingForm`

**Bez zmian:**
- `src/components/admin/WebinarForm.tsx`
- `src/components/admin/TeamTrainingForm.tsx`

**Baza danych:**
- Nowa polityka RLS `leaders_manage_team_events` na tabeli `events`

