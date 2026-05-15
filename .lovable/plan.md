Problem nie jest w danych — w bazie są zapisane 2 miejsca dla zamówienia. Problem jest w widoku: obecnie otwarty panel „Pokaż zapisanych” pokazuje przede wszystkim zgłoszenia z formularza partnerskiego, więc widzisz siebie jako zapisaną osobę, a nie pełną listę zakupionych miejsc.

Plan naprawy:

1. W `MyEventFormReferrals.tsx` zmienić kolejność i logikę widoku tak, żeby sekcja „Twoje zakupione bilety” była wyświetlana wyraźnie wewnątrz rozwijanego „Pokaż zapisanych”, nad tabelą formularza.
   - Ma pokazywać każde zamówienie użytkownika dla tego wydarzenia.
   - Dla zamówienia `quantity=2` ma pokazać 2 pozycje/miejsca.
   - Przy pustych danych ma pokazać „Gość — uzupełnij dane”.
   - Przy kupującym ma pokazać oznaczenie „Ty”.

2. Ujednolicić komponent `MyEventTicketsInline.tsx` z głównym widokiem `MyTicketOrders.tsx`, żeby nie opierał się wyłącznie na rozpoznaniu kupującego po e-mailu miejsca.
   - Pierwsze miejsce (`seat_index=1`) będzie traktowane jako kupujący.
   - Pozostałe miejsca będą edytowalne jako goście.

3. Zmienić etykietę rozwijanej sekcji w `MyEventFormLinks.tsx`, żeby nie sugerowała wyłącznie „zapisanych z formularza”.
   - Zamiast samego „Pokaż zapisanych (1)” pokażemy tekst w stylu „Pokaż bilety i zapisanych”.
   - Licznik „1 zapisanych” zostanie przy statystykach formularza, ale lista biletów będzie osobną częścią.

4. Sprawdzić po zmianach, czy `/paid-events` pokazuje:
   - zamówienie za 70 zł,
   - liczbę 2 biletów / 2 uczestników,
   - dwie pozycje na liście uczestników,
   - możliwość edycji drugiego miejsca/gościa.