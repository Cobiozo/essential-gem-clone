## Cel
Naprawić zakładkę administracyjną tak, aby lista zarejestrowanych gości PLC była widoczna, oraz zmienić nazwę podmenu z „Goście” na „Goście PLC”.

## Ustalenia
- W bazie istnieje rola `guest` dla użytkownika `sebastiansnopek87+002@gmail.com`.
- Profil tego użytkownika istnieje, ale identyfikator profilu (`profiles.id`) różni się od identyfikatora użytkownika (`profiles.user_id`).
- Obecna lista gości pobiera role z `user_roles.user_id`, a potem szuka profili po `profiles.id`, dlatego pokazuje `Goście (0)`.
- Prawidłowe powiązanie dla tej listy powinno iść po `profiles.user_id`.

## Plan zmian
1. **Lista gości PLC**
   - W `GuestsManagement.tsx` zmienić pobieranie profili z `.in('id', ids)` na `.in('user_id', ids)`.
   - Rozszerzyć typ wiersza gościa o `user_id`.
   - Mapować `GuestRow.id` na `profiles.user_id`, żeby przyciski „Widoczność”, podgląd i wpisy `guest_visibility_overrides.user_id` używały właściwego identyfikatora użytkownika.

2. **Odporność UI na braki profilu**
   - Jeśli dla roli `guest` nie ma profilu, nie blokować całej listy; nadal pokazać dostępne profile, a brakujące przypadki będzie można później diagnozować administracyjnie.
   - Zachować obecny opis statusów: czeka na e-mail, czeka na zatwierdzenie admina, aktywny.

3. **Nazwa menu**
   - W `AdminSidebar.tsx` zmienić etykietę pozycji `guests` z „Goście” na „Goście PLC”.
   - Nie zmieniać innych zakładek ani logiki uprawnień.

## Weryfikacja po wdrożeniu
- Sprawdzić, że zakładka „Lista gości” pokazuje istniejącego gościa PLC zamiast `Goście (0)`.
- Sprawdzić, że kliknięcie „Widoczność” zapisuje nadpisania dla właściwego `user_id`.
- Sprawdzić, że w lewym menu pod „Użytkownicy” widnieje „Goście PLC”.