Problem jest już zidentyfikowany: dodanie roli `moderator` do `user_roles` uruchamia trigger `sync_user_role_to_profile`, który próbuje wpisać `moderator` do starej kolumny `profiles.role`. Ta kolumna ma constraint `valid_role_values`, który nie dopuszcza wartości `moderator`, więc zapis kończy się błędem widocznym na ekranie.

Plan naprawy:

1. Zmienić logikę bazy, żeby rola `moderator` była przechowywana wyłącznie w `user_roles` i `moderator_permissions`, zgodnie z architekturą bezpieczeństwa projektu.
2. Zaktualizować funkcję/trigger `sync_profile_role_from_user_roles`, aby pomijał rolę `moderator` i nie próbował synchronizować jej do `profiles.role`.
3. Dodatkowo zabezpieczyć `admin-set-moderator`, żeby akcja `add` nie dotykała `profiles.role`, tylko:
   - dopisywała rekord `user_roles(user_id, role='moderator')`,
   - tworzyła/aktualizowała `moderator_permissions`,
   - zwracała czytelny błąd, jeśli coś pójdzie nie tak.
4. Wdrożyć ponownie funkcję `admin-set-moderator` i przetestować wywołanie przez Edge Function.
5. Zweryfikować, że po kliknięciu „Ustaw moderatorem” użytkownik pojawia się na liście moderatorów, a przełączniki uprawnień są dostępne.

Zakres celowo ograniczony: nie dodaję `moderator` do `profiles.role`, bo projektowa zasada mówi, że role mają być w osobnej tabeli `user_roles`, a nie w `profiles`.