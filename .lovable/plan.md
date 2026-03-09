

# Zmiany: podgląd zaproszenia + link rejestracyjny

## 1. Usunięcie "Codziennie 8:00–22:00" z podglądu zaproszenia

W `AutoWebinarManagement.tsx` (linie 710-713) usunąć blok z `Codziennie X:00 – Y:00`.

## 2. Dodanie linku rejestracyjnego w podglądzie zaproszenia

W podglądzie zaproszenia (po opisie) dodać widoczny link do rejestracji:
```
🔗 Zapisz się: https://purelife.info.pl/e/{slug}
```
Link będzie wyświetlany tylko gdy istnieje powiązane wydarzenie (`linkedEvent?.slug`). Będzie to klikalny link w podglądzie.

## 3. Usunięcie "Codziennie" z formularza rejestracji gości

W `EventGuestRegistration.tsx` usunąć/zmienić tekst "Webinary dostępne codziennie" (linie 233-235, 331-334) na bardziej neutralny, np. "Webinary dostępne w ciągu dnia". Usunąć też szczegóły godzin z widoku rejestracji.

## Co już działa (nie wymaga zmian)

Istniejący system **już obsługuje** pełen flow:
- **Formularz rejestracyjny** — `EventGuestRegistration.tsx` zapisuje dane do `guest_event_registrations`
- **Zapis do kontaktów prywatnych** — edge function `send-webinar-confirmation` dodaje gościa do `team_contacts` z adnotacją o wydarzeniu
- **Email z potwierdzeniem** — ten sam edge function wysyła email z linkiem do spotkania
- **Powiadomienia/przypomnienia** — system `process-pending-notifications` obsługuje harmonogram przypomnień dla zarejestrowanych gości

Jedyne co brakuje to **widoczność linku** w sekcji zaproszenia w panelu admina.

## Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `src/components/admin/AutoWebinarManagement.tsx` | Usunąć "Codziennie X:00–Y:00", dodać link rejestracyjny w podglądzie |
| `src/pages/EventGuestRegistration.tsx` | Usunąć "Webinary dostępne codziennie" i szczegóły godzinowe |

