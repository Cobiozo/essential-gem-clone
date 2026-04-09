

# Nowa zakładka "Z udostępnionego materiału ZW" w kontaktach prywatnych

## Weryfikacja formularza OTP
Formularz na stronie `/zdrowa-wiedza/:slug` zawiera wszystkie wymagane pola:
- Imię, Nazwisko, Adres e-mail, Numer telefonu (z prefixem kraju)
- Kod OTP (ZW-XXXXXX)
- Checkbox zgody na przetwarzanie danych
- Klauzula informacyjna RODO

**Wszystko działa poprawnie.**

## Nowa funkcjonalność — zakładka "Z udostępnionego materiału ZW"

### Problem
Dane gości, którzy uzyskali dostęp do materiału Zdrowej Wiedzy przez kod OTP, są zapisywane w `hk_otp_sessions`, ale partner nie widzi ich w swoich kontaktach.

### Rozwiązanie

Dodać nową pod-zakładkę w kontaktach prywatnych (`privateSubTab = 'hk-materials'`), która wyświetla dane gości z sesji OTP powiązanych z kodami wygenerowanymi przez danego partnera.

### Źródło danych

Łańcuch: `hk_otp_sessions` → `hk_otp_codes` (kolumna `partner_id` = user_id partnera) → `healthy_knowledge` (tytuł materiału).

Dane do wyświetlenia:
- Imię, nazwisko, email, telefon gościa (z `hk_otp_sessions`)
- Kod OTP (z `hk_otp_codes.code`)
- Tytuł materiału (z `healthy_knowledge.title`)
- Data otwarcia linku (`hk_otp_sessions.created_at`)
- Ostatnia aktywność (`hk_otp_sessions.last_activity_at`)
- Czas oglądania — różnica `last_activity_at - created_at` (przybliżony)

### Implementacja

| Plik | Zmiana |
|------|--------|
| `src/components/team-contacts/HKMaterialContactsList.tsx` | Nowy komponent — lista gości z materiałów ZW |
| `src/components/team-contacts/TeamContactsTab.tsx` | Dodanie pod-zakładki `hk-materials`, fetch danych z `hk_otp_sessions` JOIN `hk_otp_codes` JOIN `healthy_knowledge` |

### Szczegóły techniczne

1. **Nowy hook/query w `TeamContactsTab`**: Zapytanie Supabase pobierające sesje OTP gdzie `hk_otp_codes.partner_id = auth.uid()` i `guest_first_name IS NOT NULL`. Join z `hk_otp_codes` (kod, knowledge_id) i `healthy_knowledge` (tytuł).

2. **Komponent `HKMaterialContactsList`**: Wyświetla listę w formacie karty/tabeli z kolumnami:
   - Imię i nazwisko
   - Email, telefon
   - Kod OTP
   - Materiał (tytuł)
   - Data otwarcia
   - Czas oglądania (obliczony)

3. **Przycisk pod-zakładki**: "Z udostępnionego materiału ZW" z badge liczbowym, umieszczony między "Z Mojej Strony Partnera" a "Usunięte".

4. **RLS**: Tabela `hk_otp_sessions` potrzebuje polityki SELECT pozwalającej partnerowi odczytać sesje powiązane z jego kodami OTP. Obecnie sesje mogą nie mieć RLS dla partnerów — potrzebna nowa polityka lub zapytanie przez edge function.

### Podejście do RLS

Utworzyć funkcję SQL `SECURITY DEFINER` (`get_partner_hk_sessions`) wykonującą JOIN i zwracającą dane tylko dla kodów danego partnera. Bezpieczne i unika konieczności dodawania złożonych polityk RLS na `hk_otp_sessions`.

