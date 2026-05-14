## Cel
Naprawić proces biletów tak, aby zalogowany partner:
- widział swoje zamówienia i uczestników bezpośrednio na stronie wydarzenia `/events/bom-lodz`,
- mógł edytować dane gości,
- mógł kupić bilet dla siebie tylko raz na dane wydarzenie,
- przy kolejnych zakupach kupował już wyłącznie bilety dla gości, bez automatycznego przypisywania pierwszego biletu do siebie.

## Co znalazłem
- Sekcja `Moje bilety` została dodana tylko na stronie `/paid-events`, dlatego nie widzisz jej na aktualnej stronie `/events/bom-lodz`.
- Formularz zakupu zawsze tworzy pierwszego uczestnika z danych kupującego, więc każdy kolejny zakup partnera ponownie przypisuje pierwszy bilet do niego.
- W bazie obecne zamówienia dla `bom-lodz` mają `attendees_count = 0`, więc obecnie nie ma jeszcze danych uczestników do edycji dla tych zamówień.

## Plan zmian

### 1. Pokazać „Moje bilety” na stronie konkretnego wydarzenia
- Dodać komponent `MyTicketOrders` również do `PaidEventPage.tsx`, nad treścią lub nad panelem rejestracji.
- Dodać opcjonalny filtr `eventId`, żeby na stronie `/events/bom-lodz` pokazywać tylko bilety do tego wydarzenia.
- Zmienić zachowanie komponentu tak, aby przy braku uczestników pokazywał jasny komunikat i ewentualną akcję uzupełniania/naprawy danych, a nie znikał lub wyglądał jak pusty.

### 2. Umożliwić edycję gości w „Moje bilety”
- Zachować obecny dialog edycji uczestnika.
- Dodać obsługę sytuacji, gdy stare zamówienie nie ma rekordów uczestników: użytkownik zobaczy informację, że zamówienie wymaga wygenerowania listy uczestników.
- Dla nowych zamówień lista uczestników będzie widoczna od razu i goście będą edytowalni.

### 3. Rozdzielić „kupującego” od „uczestnika”
- W `PurchaseDrawer.tsx` dodać logikę sprawdzającą, czy zalogowany użytkownik ma już bilet dla siebie na dane wydarzenie.
- Jeśli nie ma biletu dla siebie: pierwszy bilet pozostaje przypisany do kupującego, jak dotychczas.
- Jeśli już ma bilet dla siebie: formularz przełącza się w tryb „kupuję dla gości”:
  - dane kupującego nadal służą do zamówienia i emaila,
  - żaden uczestnik nie jest automatycznie ustawiany jako kupujący,
  - wszystkie miejsca są formularzami gości,
  - teksty typu „Kupujący jest zapisany jako Uczestnik 1” zostają zastąpione komunikatem „Masz już bilet dla siebie — te bilety będą dla gości”.

### 4. Wzmocnić zabezpieczenie po stronie Edge Functions
- W `register-event-transfer-order` i `payu-create-order` wykrywać zalogowanego użytkownika z tokenu.
- Przed zapisem sprawdzić, czy użytkownik ma już własny bilet na to wydarzenie.
- Jeśli ma już własny bilet, backend nie przypisze pierwszego uczestnika do kupującego; użyje danych gościa z formularza albo placeholderów do późniejszego uzupełnienia.
- Jeśli frontend lub ktoś ręcznie wyśle błędny payload, backend nadal zachowa poprawną regułę.

### 5. Uporządkować dane zapisywane w bazie dla nowych zamówień
- Nowe zamówienia będą zapisywać `user_id`, `quantity`, `total_amount` i rekordy uczestników zgodne z liczbą miejsc.
- Po zapisie funkcja zwróci informację o liczbie zapisanych uczestników, żeby frontend mógł od razu odświeżyć `Moje bilety`.

### 6. Naprawa starych zamówień
- Przygotuję osobną migrację/operację danych dla istniejących zamówień bez uczestników, aby utworzyć brakujące rekordy uczestników na podstawie `quantity` i danych kupującego.
- Dla Twojego ostatniego zamówienia, które system zapisał jako `quantity = 1`, nie da się automatycznie odtworzyć pełnych danych drugiej osoby z bazy, bo nie zostały zapisane. Można jednak umożliwić ręczne uzupełnienie gościa po wygenerowaniu miejsca/uczestnika.

## Pliki do zmiany
- `src/pages/PaidEventPage.tsx`
- `src/components/paid-events/MyTicketOrders.tsx`
- `src/components/paid-events/public/PurchaseDrawer.tsx`
- `supabase/functions/register-event-transfer-order/index.ts`
- `supabase/functions/payu-create-order/index.ts`
- migracja SQL dla brakujących danych uczestników / ewentualnych polityk RLS, jeśli obecne okażą się niewystarczające

## Efekt dla użytkownika
Po wejściu na `/events/bom-lodz` zobaczysz sekcję `Moje bilety` z zamówieniami, liczbą biletów, uczestnikami i edycją gości. Przy kolejnym zakupie, jeśli masz już własny bilet, system nie dopisze Cię drugi raz jako uczestnika — kupisz bilety wyłącznie dla gości.