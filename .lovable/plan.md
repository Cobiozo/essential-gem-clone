

## Dodanie sekcji zgod prawnych (Regulamin, Polityka Prywatnosci, RODO) dla uzytkownikow

### Problem
Kolumny `accepted_terms`, `accepted_privacy`, `accepted_rodo` i `accepted_terms_at` istnieja w bazie danych, a panel admina je wyswietla, ale **uzytkownicy nie maja zadnego miejsca w interfejsie, gdzie moga te zgody wyrazic**. Brakuje checkboxow w formularzu uzupelniania profilu oraz sekcji w ustawieniach konta.

### Rozwiazanie

Zmiany w 3 plikach:

---

### 1. ProfileCompletionForm.tsx -- checkboxy zgod przy rejestracji/uzupelnianiu profilu

Dodanie na koncu formularza (przed przyciskami) nowej karty "Zgody i regulaminy" z 3 obowiazkowymi checkboxami:

- **Akceptuje Regulamin** (wymagany)
- **Akceptuje Polityke Prywatnosci** (wymagany)
- **Wyrazam zgode RODO** (wymagany)

Kazdy checkbox z linkiem do odpowiedniego dokumentu (jesli istnieje).

Zmiany:
- 3 nowe stany: `acceptedTerms`, `acceptedPrivacy`, `acceptedRodo`
- Inicjalizacja z profilu (`profile.accepted_terms` itd.)
- Walidacja: jesli ktorykolwiek nie zaznaczony -- blad "Wszystkie zgody sa wymagane"
- Przy zapisie: `accepted_terms: true`, `accepted_privacy: true`, `accepted_rodo: true`, `accepted_terms_at: new Date().toISOString()`

### 2. useProfileCompletion.ts -- uwzglednienie zgod w statusie kompletnosci

Dodanie sprawdzenia `accepted_terms`, `accepted_privacy`, `accepted_rodo` do listy brakujacych pol. Dzieki temu profil bez zaakceptowanych zgod nie bedzie traktowany jako kompletny, a uzytkownik zostanie przekierowany do formularza.

### 3. MyAccount.tsx -- sekcja zgod w zakladce Profil (widok tylko do odczytu)

W widoku profilu (gdy `showProfileForm = false`), po sekcji "Informacje o koncie", dodanie karty "Zgody i regulaminy" pokazujacej aktualny status zgod uzytkownika:

- Zielony znacznik lub czerwony X przy kazdej zgodzie
- Data akceptacji (jesli dostepna)
- Przycisk "Edytuj profil" juz istnieje i pozwala przejsc do formularza edycji gdzie mozna zmienic zgody

---

### Pliki do zmian

| Plik | Typ zmiany |
|------|------------|
| `src/components/profile/ProfileCompletionForm.tsx` | Dodanie karty z 3 checkboxami zgod + walidacja + zapis do bazy |
| `src/hooks/useProfileCompletion.ts` | Dodanie sprawdzenia zgod do listy brakujacych pol |
| `src/pages/MyAccount.tsx` | Sekcja "Zgody i regulaminy" w widoku profilu (read-only) |

