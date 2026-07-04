## Cel

Trzy poprawki wokół kampanii e-mail „Zapisz się":

1. Po zalogowaniu użytkownik ma trafić dokładnie na wydarzenie z maila.
2. Przycisk **Usuń** przy turze ma działać zawsze (twarde, nieodwracalne usunięcie).
3. Przy tworzeniu/edycji zdarzenia z zaproszeniami e-mail admin ma wybrać, do których ról ma trafić wysyłka (admin / partner / klient / specjalista).

---

## 1. Przekierowanie po logowaniu z linku e-mail

Problem: link w mailu prowadzi do `/events/team-meetings?event=<id>&utm=email_invite`. Strona przekierowuje niezalogowanego na `/auth?returnTo=<zakodowany URL>`, ale po zalogowaniu użytkownik ląduje na `/` (dashboard), nie na wydarzeniu.

Przyczyny do naprawy:
- W `src/pages/Auth.tsx` `returnTo` gubi się między krokami (MFA / hasło tymczasowe / OTP e-mail) — po tych krokach `navigate(returnTo)` już nie odpala.
- `sessionStorage` nie jest używany jako fallback, więc każdy reset stanu Auth (przeładowanie po OTP, MFA challenge) traci parametr URL.

Zmiany (tylko frontend):
- Na wejściu do `Auth.tsx`, jeśli `returnTo` istnieje w URL, zapisać go do `sessionStorage.setItem('postLoginReturnTo', returnTo)`. Przy każdym kroku (login, MFA challenge, hasło tymczasowe, OTP e-mail) przekazywać parametr dalej w URL, a jako fallback czytać `sessionStorage`.
- Po pełnym zalogowaniu (`user && rolesReady && !mfaPending && !mustChangeTempPassword`) czytać `postLoginReturnTo` z sessionStorage, jeśli w URL już go nie ma, i nawigować do niego, a potem czyścić klucz.
- Analogicznie w `ChangeTempPassword.tsx` / komponentach MFA — jeżeli po sukcesie przekierowują do `/dashboard`, zmienić na: `sessionStorage.getItem('postLoginReturnTo') || '/dashboard'`.
- `TeamMeetingsPage.tsx` i `WebinarsPage.tsx` — zostaje bez zmian (już przekazują `returnTo`), tylko upewnić się, że `event` param nadal wywołuje `defaultOpen` i pulsujący scroll (już jest).

---

## 2. Przycisk „Usuń" tury — zawsze aktywny, twarde usunięcie

W `src/components/admin/TeamTrainingForm.tsx` (linia ~1049):

- Usunąć `disabled={isSent}` z przycisku Usuń.
- Podpiąć `AlertDialog` (shadcn) z treścią:
  „Usunąć turę? Operacja jest nieodwracalna. Kampania zostanie usunięta z bazy wraz z historią odbiorców tej tury."
- Po potwierdzeniu:
  - Jeśli tura ma `c.id` (istnieje w DB): wywołać `supabase.from('event_email_campaigns').delete().eq('id', c.id)` oraz `supabase.from('event_email_recipients').delete().eq('campaign_id', c.id)` (twarde, bez soft-delete).
  - Usunąć wpis z lokalnego stanu `campaigns`.
  - Toast „Tura została usunięta".
- Ostrzeżenie wizualne dla tury już wysłanej (badge „Wysłano") pozostaje — sama możliwość usunięcia jest odblokowana.

RLS `event_email_campaigns` / `event_email_recipients` już pozwala adminowi na `DELETE` (weryfikacja: `supabase--read_query` przed edycją; jeśli nie — dorzucę policy w migracji).

---

## 3. Wybór ról odbiorców dla kampanii

### Migracja DB

Dodać kolumnę:

```sql
ALTER TABLE public.event_email_campaigns
  ADD COLUMN IF NOT EXISTS target_roles text[]
  NOT NULL DEFAULT ARRAY['admin','partner','client','specjalista']::text[];
```

(Domyślnie wszystkie role — zgodność wsteczna dla już utworzonych kampanii.)

### UI (`TeamTrainingForm.tsx`)

W bloku każdej tury, poniżej pola „Etykieta", dodać sekcję **„Wyślij do ról"** z 4 checkboxami: Admin / Partner / Klient / Specjalista. Domyślnie wszystkie zaznaczone. Walidacja: co najmniej jedna rola musi być zaznaczona przed zapisem.

Wartości zapisywane w `event_email_campaigns.target_roles` przy insert/update (analogicznie do reszty pól kampanii w istniejącej funkcji `persist campaigns`).

### Edge function `process-event-email-campaigns`

W bloku ładowania odbiorców (część `!camp.test_mode`) po pobraniu profili dorobić filtrację po rolach z `user_roles`:

```ts
const roles = camp.target_roles ?? ['admin','partner','client','specjalista'];
const { data: usersInRoles } = await supabase
  .from('user_roles')
  .select('user_id')
  .in('role', roles)
  .in('user_id', userIds);
const allowed = new Set(usersInRoles?.map(r => r.user_id) ?? []);
eligible = eligible.filter(p => allowed.has(p.user_id));
```

Tryb testowy (`test_mode`) ignoruje `target_roles` — nadal wysyła tylko do wskazanego użytkownika testowego.

Redeploy funkcji po zmianach.

---

## Pliki do zmiany

- `src/pages/Auth.tsx` — persystencja `returnTo` w sessionStorage + użycie po MFA/temp password.
- `src/pages/ChangeTempPassword.tsx` (i ewentualnie komponent MFA challenge) — respekt `postLoginReturnTo`.
- `src/components/admin/TeamTrainingForm.tsx` — odblokowany „Usuń" z AlertDialog + checkboxy ról w każdej turze + zapis `target_roles`.
- `supabase/migrations/*` — dodanie kolumny `target_roles`.
- `supabase/functions/process-event-email-campaigns/index.ts` — filtracja odbiorców po `target_roles`.

Backend zmieniamy tylko tam, gdzie jest to bezpośrednio wymagane przez prośbę (persistencja target_roles + filtracja). Reszta logiki kampanii bez zmian.
