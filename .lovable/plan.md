## Zmiany

### 1. `src/pages/MyAccount.tsx` — karta „Usuń konto"
Uprościć copy dla użytkownika — żadnych wzmianek o 30 dniach, administratorze ani przywracaniu. To, co dzieje się w panelu admina, jest sprawą zaplecza.

- `CardDescription` (linia 1390) → jedno zdanie typu:
  „Usunięcie konta jest **nieodwracalne**. Stracisz dostęp do wszystkich swoich danych, postępów, materiałów i historii. Przemyśl tę decyzję."
- `AlertDialogTitle` (1404) → „Potwierdź usunięcie konta".
- `AlertDialogDescription` (1405–1416) → zostawić wyłącznie zdanie o nieodwracalności + prośbę o wpisanie e-maila do potwierdzenia (usunąć fragment „administrator może przywrócić").
- Przycisk w dialogu (1437) → „Usuń konto" zamiast „Zgłoś usunięcie konta".

Backend (soft-delete 30 dni, panel admina, CRON purga) bez zmian — to wyłącznie UI/copy.

### 2. Samouczek — ukryć dla gościa PLC
Rola gościa PLC = `'guest'` (potwierdzone w `AuthContext.tsx`).

- `src/hooks/useOnboardingTour.ts`: w `useEffect` (l. 36) early-return gdy `userRole?.role === 'guest'` → brak auto-welcome dialogu po pierwszym logowaniu.
- `src/components/dashboard/DashboardTopbar.tsx` (l. 205 i 285): ukryć przycisk „Samouczek" (ikona w pasku + pozycja w dropdown), gdy `userRole?.role === 'guest'`.

### 3. Baner uzupełnienia danych — podświetlanie wszystkich brakujących pól
Baner `ProfileFieldsBanner` już dziś przekazuje listę brakujących pól do `/my-account?highlight=field1,field2`. Trzeba domknąć drugą stronę: na `MyAccount` realnie podświetlić te pola na czerwono — wszystkie, nie tylko adresowe (`first_name`, `last_name`, `phone_number`, `street_address`, `postal_code`, `city`, `country`, `eq_id` itp.).

- `src/pages/MyAccount.tsx`:
  - Odczytać `?highlight=` z `useSearchParams`, sparsować na `Set<string>` brakujących pól.
  - Trzymać `missingSet` w stanie. Po każdym udanym zapisie profilu (`handleSave`) usunąć z setu pola, które właśnie zostały wypełnione (re-walidacja po wartościach z formularza); gdy `missingSet` pustnieje, usunąć parametr `highlight` z URL.
  - Każdemu `<Input>` / `<Select>` odpowiadającemu polu z `missingSet` dodać warunkowy `className="border-destructive ring-1 ring-destructive focus-visible:ring-destructive"` + krótki tekst pomocniczy „Pole wymagane" pod inputem.
  - Auto-scroll do pierwszego podświetlonego pola po wejściu na stronę (ref + `scrollIntoView({ behavior:'smooth', block:'center' })`).
- `src/components/profile/ProfileFieldsBanner.tsx`:
  - Już ma `required_fields` z admina i refetchuje profil — żadnych zmian logiki nie trzeba poza upewnieniem się, że `staleTime` nie zablokuje schowania banera po zapisie. Po `handleSave` w `MyAccount` wywołać `queryClient.invalidateQueries({ queryKey: ['profile-fields-banner-profile', user.id] })`, żeby baner zniknął natychmiast.
  - Usunąć wymuszony `navigate('/dashboard')` z `useEffect` (l. 84–87) — użytkownik ma zostać tam gdzie jest; baner zniknie sam, gdy `missing.length === 0`.

Wynik: użytkownik klika baner → trafia do `/my-account` z czerwono oznaczonymi wszystkimi brakującymi polami → uzupełnia → klika „Zapisz" → baner natychmiast znika, podświetlenia gasną.