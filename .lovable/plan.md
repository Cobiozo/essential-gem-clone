

# Zakładka "Formularze" + zapis leadów do kontaktów prywatnych

## Opis
Dodanie zakładki "Formularze" w zarządzaniu stronami partnerskimi (obok Ankieta). Dane z formularzy kontaktowych na stronie partnera będą automatycznie zapisywane jako kontakty prywatne (`contact_type: 'private'`) w tabeli `team_contacts` partnera, widoczne w nowej pod-zakładce "Z Mojej Strony Partnera" w sekcji Pure-kontakty.

## Zmiany

### 1. Zakładka "Formularze" w admin panelu
**Plik: `src/components/admin/PartnerPagesManagement.tsx`**
- Dodanie TabsTrigger "Formularze" z ikoną `FileInput`
- Nowy komponent `PartnerFormsManager` — podgląd wszystkich leadów zebranych z formularzy stron partnerskich (lista z filtrami po partnerze, dacie)
- Dane pobierane z `team_contacts` WHERE `contact_source = 'Strona partnerska'`

**Nowy plik: `src/components/admin/PartnerFormsManager.tsx`**
- Tabela leadów: imię, nazwisko, email, telefon, partner (właściciel strony), data dodania
- Filtrowanie po partnerze i dacie
- Podgląd szczegółów kontaktu

### 2. Zapis leada z formularza kontaktowego
**Plik: `src/components/partner-page/sections/ContactFormSection.tsx`**
- Po wysłaniu formularza, oprócz emaila — insert do `team_contacts`:
  - `user_id` = partner's user_id (nowy prop `partnerUserId`)
  - `contact_type` = `'private'`
  - `contact_source` = `'Strona partnerska'`
  - `first_name`, `last_name`, `email`, `phone_number` z pól formularza
  - `role` = `'client'`
  - `notes` = treść wiadomości (jeśli jest pole textarea)
  - `contact_reason` = `'Formularz kontaktowy'`
- Nowy prop `partnerUserId: string` przekazywany z `PartnerPage.tsx`

**Plik: `src/pages/PartnerPage.tsx`**
- Przekazać `partnerUserId={page.user_id}` do sekcji `contact_form` i `products_with_form`

**Plik: `src/components/partner-page/sections/ProductsWithFormSection.tsx`**
- Przekazać `partnerUserId` do `ContactFormSection`

### 3. Pod-zakładka "Z Mojej Strony Partnera" w kontaktach prywatnych
**Plik: `src/components/team-contacts/TeamContactsTab.tsx`**
- Rozszerzenie `privateSubTab` o wartość `'partner-page'`
- Nowy przycisk "Z Mojej Strony Partnera" obok istniejących
- Filtrowanie: `privateContacts.filter(c => c.contact_source === 'Strona partnerska')`
- Wyświetlanie w tym samym `TeamContactAccordion` z `contactType="private"`

### 4. Edge function insert — bez auth
Ponieważ formularz wypełnia niezalogowany użytkownik, insert do `team_contacts` musi być wykonany przez edge function (RLS nie pozwoli anonowi wstawić wiersza).

**Nowa edge function: `save-partner-lead`**
- Przyjmuje: `partner_user_id`, `first_name`, `last_name`, `email`, `phone_number`, `message`
- Walidacja danych (email, wymagane pola)
- Insert do `team_contacts` z service_role key
- Zwraca sukces/błąd

## Pliki do utworzenia
- `src/components/admin/PartnerFormsManager.tsx`
- `supabase/functions/save-partner-lead/index.ts`

## Pliki do modyfikacji
- `src/components/admin/PartnerPagesManagement.tsx` — nowa zakładka
- `src/components/partner-page/sections/ContactFormSection.tsx` — wywołanie edge function
- `src/pages/PartnerPage.tsx` — przekazanie `partnerUserId`
- `src/components/partner-page/sections/ProductsWithFormSection.tsx` — przekazanie `partnerUserId`
- `src/components/team-contacts/TeamContactsTab.tsx` — nowa pod-zakładka

