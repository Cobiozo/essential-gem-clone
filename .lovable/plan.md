Plan naprawy

1. Naprawię wykrywanie istniejącej rezerwacji zalogowanego użytkownika
- W panelu „Twoje bilety na to wydarzenie” uwzględnię także bezpłatne rezerwacje ze statusem `awaiting_email_confirmation`, aby użytkownik nie widział błędnie „0 biletów” / „Nie masz jeszcze biletów”.
- Dla takiej rezerwacji pokażę jasny status: „Miejsce zarezerwowane — oczekuje na potwierdzenie e-mail” albo „Bilet potwierdzony”, zależnie od danych.
- Dodam obsługę błędu zapytania, żeby panel nie udawał pustego stanu, jeśli baza zwróci problem z odczytem.

2. Zablokuję ponowną rezerwację tego samego zalogowanego użytkownika na bezpłatne wydarzenie
- W `PurchaseDrawer` dla bezpłatnego wydarzenia nie będę przełączać zalogowanego użytkownika z istniejącą rezerwacją w tryb „gości”.
- Po kliknięciu „Zarezerwuj miejsce” pokażę baner/toast: „Masz już zarezerwowane miejsce na to wydarzenie. Sprawdź skrzynkę e-mail, aby potwierdzić rezerwację lub odebrać bilet.”
- Dodatkowo poprawię obsługę odpowiedzi `already_registered` z Edge Function, aby zamiast technicznego błędu „Edge Function returned a non-2xx status code” zawsze wyświetlała zrozumiały komunikat.

3. Poprawię komunikat po potwierdzeniu e-maila dla bezpłatnego wydarzenia
- W `FreeEventConfirmPage.tsx` usunę treści o płatności dla darmowych wydarzeń.
- Zostawię komunikat zgodny z wymaganiem:
  - „Twoje dane i rejestracja zostały poprawnie potwierdzone”
  - „Sprawdź skrzynkę e-mail, ponieważ na nią dostałeś bilet na to wydarzenie z kodem QR.”
  - „Dziękujemy i do zobaczenia na wydarzeniu!”

4. Wzmocnię backend dla rezerwacji bezpłatnych
- W `register-free-event-order` zostawię blokadę duplikatu po e-mailu i użytkowniku, ale zwrócę stabilny kod oraz przyjazną wiadomość dla frontendu.
- Sprawdzę, czy zalogowany użytkownik jest przypisywany po `user_id` poprawnie, aby przyszłe rezerwacje zawsze pojawiały się w jego panelu.

5. Weryfikacja
- Sprawdzę przypadek Sebastian Snopek87 / wydarzenie `linkedin-w-firmie`: istnieje rekord rezerwacji `awaiting_email_confirmation`, więc po zmianie powinien być widoczny jako zarezerwowane miejsce zamiast „0 biletów”.
- Zweryfikuję, że ponowne kliknięcie rezerwacji nie tworzy kolejnego zamówienia i pokazuje właściwy baner.
- Zweryfikuję tekst strony potwierdzenia dla wydarzenia bezpłatnego.