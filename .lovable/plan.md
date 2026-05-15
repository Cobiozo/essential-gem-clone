Znalazłem przyczynę: napis „Twoje bilety na to wydarzenie” jest obecnie renderowany tylko na liście `/paid-events`, w komponencie karty wydarzenia. Na stronie, którą teraz oglądasz (`/events/bom-lodz`), używany jest inny widok (`PaidEventPage`) i tam pokazuje się stary blok `Moje bilety`, więc dokładnie tej sekcji nie ma.

Plan naprawy:

1. Na stronie szczegółów wydarzenia (`/events/:slug`) zastąpić/ujednolicić obecny blok `Moje bilety` tak, aby używał tego samego widoku biletów co karta wydarzenia: `Twoje bilety na to wydarzenie`.
2. Dopilnować, żeby sekcja była widoczna wysoko na stronie szczegółów wydarzenia, od razu pod hero/nawigacją i przed opisem wydarzenia.
3. W sekcji pokazać wszystkie zakupione miejsca z jednego zamówienia, np. 2 uczestników: kupujący + gość, z możliwością edycji danych gościa.
4. Zostawić oddzielnie grupę „zapisani przez mój link” tylko dla rejestracji partnerskich, bez mieszania jej z zakupionymi biletami.

Technicznie:
- `PaidEventCard` już renderuje `MyEventTicketsInline`, dlatego tam tekst istnieje.
- `PaidEventPage` obecnie importuje i renderuje `MyTicketOrders`, dlatego na `/events/bom-lodz` nie widzisz identycznego panelu.
- Po akceptacji zmienię `PaidEventPage`, żeby renderował `MyEventTicketsInline eventId={event.id}` zamiast starego widoku dla tej konkretnej strony.