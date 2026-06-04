## Cel
Moderator ma być wyłącznie dodatkową warstwą dostępu do CMS, bez zmiany podstawowej roli użytkownika. Partner-moderator nadal ma być widoczny jako „Partner”, a w menu ma dostać przycisk „Panel CMS” z przypisanymi modułami.

## Plan naprawy

1. **Rozdzielić rolę bazową od roli technicznej `moderator`**
   - W `AuthContext` zmienić pobieranie `userRole`, żeby wybierało rolę bazową (`admin`, `partner`, `specjalista`, `client`, `user`) zamiast przypadkowego / najnowszego wpisu z `user_roles`.
   - `moderator` pozostaje tylko wpisem pomocniczym w `user_roles`, używanym przez `useModeratorAccess`, ale nie jako rola wyświetlana w profilu i filtrach dashboardu.
   - Dodać fallback: jeśli `profiles.role` jest ustawione na rolę bazową, użyć jej jako źródła prawdy dla UI.

2. **Naprawić etykietę roli w lewym panelu dashboardu**
   - W `UserProfileCard` pokazywać bazową rolę z profilu / przefiltrowanego `userRole`, nigdy `moderator`.
   - Dla użytkownika ze screenów powinno to dać badge „Partner”, nie „Klient”.

3. **Pokazać „Panel CMS” w sidebarze użytkownika**
   - W `DashboardSidebar` dodać `useModeratorAccess` i użyć `hasAnyAdminAccess`.
   - Pozycja `admin` ma być widoczna dla admina oraz dla moderatora z co najmniej jednym nadanym modułem.
   - Label dla nie-admina: „Panel CMS”; dla admina zostaje panel administracyjny.

4. **Ustabilizować filtrowanie modułów w panelu admina**
   - Wejście do `/admin` zostaje chronione przez `hasAnyAdminAccess`.
   - `AdminSidebar` dalej pokaże tylko moduły, które admin włączył moderatorowi.
   - Dla dodatkowej strony `Centrum aktualności` poprawić widoczność linku w admin sidebarze, żeby nie była dostępna moderatorowi bez `news_hub`.

5. **Naprawić problem „nie mogę włączyć dostępu”**
   - W `ModeratorsManagement` zmienić zapis przełączników tak, żeby po kliknięciu od razu zapisywał czysty JSON: `true` dodaje uprawnienie, `false` usuwa klucz zamiast zostawiać `false`.
   - Dodać `toast.success` po udanym zapisie i lepszy komunikat błędu, żeby było widać czy zapis faktycznie przeszedł.
   - Zostawić backend `admin-set-moderator` jako zapis przez edge function service role, bo to prawidłowo omija RLS i nie zmienia roli bazowej.

## Pliki do zmiany
- `src/contexts/AuthContext.tsx`
- `src/components/dashboard/UserProfileCard.tsx`
- `src/components/dashboard/DashboardSidebar.tsx`
- `src/components/admin/AdminSidebar.tsx`
- `src/components/admin/ModeratorsManagement.tsx`

## Test po wdrożeniu
1. Admin nadaje użytkownikowi-partnerowi status moderatora i włącza np. `platform-teams`.
2. Po odświeżeniu admin widzi, że przełącznik został zapisany.
3. Partner-moderator po zalogowaniu widzi w profilu rolę „Partner”.
4. W lewym menu dashboardu widzi „Panel CMS”.
5. Po wejściu do CMS widzi tylko przypisane elementy sidebara, a nie cały panel admina.