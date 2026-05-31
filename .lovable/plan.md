## Co jest faktycznie zepsute

Problem nie jest już w klikaniu zgód ani w samym formularzu. Aktualny błąd z logów backendu to:

`paid_event_orders_status_check` odrzuca status `awaiting_email_confirmation`.

Czyli formularz dochodzi do backendu, backend próbuje utworzyć rezerwację, ale baza danych blokuje zapis, bo tabela `paid_event_orders` pozwala tylko na stare statusy: `pending`, `awaiting_transfer`, `paid`, `cancelled`, `refunded`.

## Zasada działania, którą wdrażamy

Dla wydarzenia bezpłatnego flow ma działać tak:

1. Użytkownik wybiera `Rezerwacja` przy wydarzeniu bezpłatnym.
2. W drawerze `Zarezerwuj miejsce` akceptuje regulamin i zgodę marketingową.
3. Kliknięcie `Zarezerwuj miejsce` tworzy zamówienie/rezerwację ze statusem oczekiwania na potwierdzenie email.
4. UI pokazuje komunikat sukcesu: rezerwacja przyjęta, wysłano email potwierdzający.
5. System wysyła email z CTA do potwierdzenia adresu.
6. Po kliknięciu CTA system potwierdza rezerwację, generuje bilet QR/PDF i wysyła drugi email z biletem.

## Plan naprawy

1. **Naprawić ograniczenie statusów w bazie**
   - Rozszerzyć constraint `paid_event_orders_status_check`, żeby dopuszczał `awaiting_email_confirmation`.
   - Dodać również statusy techniczne używane/oczekiwane przez istniejący kod, jeżeli są potrzebne do spójnego przepływu (`failed`, `expired`), żeby późniejsze anulowanie/wygasanie rezerwacji nie rozbijało się o tę samą blokadę.

2. **Dopiąć backend rezerwacji bezpłatnej do logiki płatności przelewem**
   - `register-free-event-order` ma tworzyć rezerwację analogicznie do zamówienia przelewowego, ale z kwotą `0` i statusem `awaiting_email_confirmation`.
   - Zachować token potwierdzający email i datę wysłania potwierdzenia.
   - Zweryfikować, czy insert obejmuje pola wymagane przez dalsze kroki generowania biletu.

3. **Poprawić ekran sukcesu w drawerze**
   - Po udanej rezerwacji bezpłatnej nie tylko zamykać drawer z toastem, ale pokazać czytelny stan sukcesu podobny do płatności przelewem:
     - „Rezerwacja przyjęta”
     - informacja, że wysłano email z linkiem potwierdzającym
     - przypomnienie o folderze Spam
   - Dzięki temu użytkownik zobaczy dokładnie ten baner/komunikat, którego oczekujesz.

4. **Sprawdzić potwierdzenie email i drugi email z biletem**
   - Przetestować `register-free-event-order` na realnym wydarzeniu `kompleksowe szkolenie test`.
   - Potwierdzić w logach, że pierwszy email został wysłany.
   - Sprawdzić, czy `confirm-free-event-reservation` po kliknięciu tokenu aktualizuje zamówienie na `paid`, generuje kod biletu i uruchamia wysyłkę emaila z biletem.

5. **Jeśli wyjdzie kolejna blokada po potwierdzeniu**
   - Jeżeli drugi etap zatrzyma się na generowaniu PDF/biletu albo SMTP, naprawić to w tym samym przepływie, bo celem jest pełny cykl: rezerwacja → email potwierdzający → kliknięcie CTA → email z biletem.

## Oczekiwany efekt po wdrożeniu

Po kliknięciu `Zarezerwuj miejsce` dla bezpłatnego wydarzenia użytkownik zobaczy komunikat sukcesu, a system zapisze rezerwację i wyśle email potwierdzający. Po kliknięciu CTA w emailu użytkownik otrzyma bilet QR/PDF tak jak w logice płatności przelewem, tylko bez płatności.