## Co się dzieje

W bazie są jednocześnie:
- aktualne konto: **Józef Pyza** (`sebastiansnopek87+002@gmail.com`),
- historyczne zgłoszenie/usunięte konto: **Roma Romanowski / Romanek Romano** z tym samym e-mailem.

Stare rekordy mają już `account_deleted_at`, więc są oznaczone jako historia usuniętego konta. Problem jest w widoku admina zgłoszeń: lista nadal pobiera wszystkie `event_form_submissions` i `paid_event_orders` dla wydarzenia oraz scala/dedupuje je po samym e-mailu. To powoduje, że usunięta historia może mieszać się z nowym kontem, jeśli e-mail jest taki sam.

## Plan naprawy

1. **Zablokować pobieranie historii usuniętych kont w formularzach zgłoszeń eventu**
   - W `EventFormSubmissions.tsx` dodać filtr `account_deleted_at IS NULL` dla `event_form_submissions`.
   - Dodać ten sam filtr dla `paid_event_orders` używanych jako drugi strumień danych w tej liście.
   - Dzięki temu rekord „Roma Romanowski” z `account_deleted_at` nie będzie już pokazywany jako aktywne zgłoszenie.

2. **Poprawić scalanie zgłoszeń z zamówieniami**
   - Nie scalać po e-mailu z rekordami oznaczonymi jako usunięte.
   - Jeśli trzeba łączyć po e-mailu, dopuszczać tylko aktywne rekordy (`account_deleted_at IS NULL`).
   - Priorytetem pozostaje łączenie po `order_id`, nie po historii e-maila.

3. **Poprawić rozpoznawanie typu osoby w zgłoszeniach**
   - Przy mapowaniu e-mail → profil brać tylko aktywne profile, bez `deletion_status` i bez `is_active=false`.
   - Nie używać usuniętych/anonymizowanych profili do klasyfikacji „Gość PLC / Partner”.

4. **Wzmocnić backendową listę zamówień admina**
   - W `admin-list-event-orders` wykluczyć `paid_event_orders.account_deleted_at IS NOT NULL`, aby fallback z edge function też nie zwracał historii usuniętych kont.

5. **Naprawić procedurę usuwania konta adminem**
   - Obecna ścieżka `admin-delete-user` zeruje powiązania, ale nie używa pełnego stemplowania historii tak jak nowsza ścieżka finalizacji usunięcia.
   - Ujednolicić ją tak, aby przed usunięciem oznaczała bilety/zgłoszenia danego konta jako `account_deleted_at`, `account_deleted_action`, `account_deleted_snapshot`.
   - Ważne: oznaczanie po e-mailu musi dotyczyć wyłącznie rekordów starego konta/historycznych gościnnych rekordów, a widoki aktywne i tak muszą je później ignorować.

6. **Migracja porządkująca istniejące dane**
   - Dodać migrację, która dla obecnego przypadku upewni się, że historyczne rekordy z tego e-maila i starymi danymi (`Roma/Romanek Romanowski/Romano`) mają `account_deleted_at`.
   - Nie usuwać danych księgowych/historycznych, tylko sprawić, że nie będą używane do aktywnych widoków i dopasowań.

7. **Weryfikacja**
   - Sprawdzić zapytaniem, że aktywna lista zgłoszeń dla tego wydarzenia pokazuje Józefa Pyzę, a nie Romę/Romanka.
   - Sprawdzić, że Goście PLC i Zarządzanie użytkownikami nadal pokazują aktualne konto Józefa Pyzy.

## Zasada po wdrożeniu

Nowe konto jest zawsze nowym kontem. Ten sam e-mail nie może odziedziczyć żadnych danych, statusów, zgłoszeń, biletów ani nazw z konta, które zostało usunięte lub zanonimizowane.