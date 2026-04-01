

# Uzupełnienie brakujących kluczy tłumaczeń w całej aplikacji

## Problem widoczny na screenie

Tytuł okna historii wyświetla surowy klucz `teamContacts.historyTitle` zamiast przetłumaczonego tekstu. Oznacza to, że klucz nie istnieje w tabeli `i18n_translations` w bazie danych.

## Skala problemu

Po przeanalizowaniu całego kodu:

### A. Moduł team-contacts (12 plików, ~200 hardkodowanych stringów PL)

Tylko 4 z 18 plików używają `useLanguage`. Reszta ma czyste polskie stringy:

| Plik | Hardkodowane stringi (przykłady) |
|------|----------------------------------|
| `TeamContactsTab.tsx` | "Kontakty prywatne", "Dodaj kontakt", "Eksport", "Filtry" |
| `TeamContactFilters.tsx` | "Filtry", "Wyczyść", "Szukaj", status labels |
| `PrivateContactForm.tsx` | "Zawód", "Status relacji", "Czynny obserwujący", "Potencjalny klient" |
| `TeamContactForm.tsx` | "Dodaj kontakt", "Zapisz" |
| `TeamContactExport.tsx` | "Kontakty prywatne", "Wygenerowano", status labels |
| `TeamMap.tsx` | "Brak kontaktów do wyświetlenia" |
| `ContactEventInfoButton.tsx` | "Dołączył", "Nie dołączył" |
| `ContactEventHistory.tsx` | "Samodzielna rejestracja" |
| `ContactExpandedDetails.tsx` | Etykiety pól |
| `DeletedContactsList.tsx` | "Usunięte kontakty" |
| `EventGroupedContacts.tsx` | "Anuluj", dialogi potwierdzenia |
| `InviteToEventDialog.tsx` | "Alternatywny email", toasty |
| `TeamContactHistoryDialog.tsx` | "Zaproszono na wydarzenie", "Samodzielna rejestracja", "Ponowne wysłanie", "Alternatywny email" |

### B. Moduł events (częściowo przetłumaczony)

`EventDetailsDialog.tsx` używa hardkodowanego `pl/enUS` zamiast `getAppDateLocale`. Część komponentów ma `useLanguage` ale wiele stringów nadal jest po polsku.

### C. Moduł training (0 plików z useLanguage)

Cały moduł `src/components/training/` nie korzysta z tłumaczeń — ale to jest moduł treściowy (treści szkoleniowe tłumaczone przez CMS), więc UI labels to odrębna kwestia.

### D. Admin panel (~21 plików z useLanguage, ale setki hardkodowanych stringów)

Panel admina jest celowo po polsku (architektonicznie) — NIE tłumaczę go.

### E. Brakujące klucze w DB

Klucze używane z `t()` w kodzie, które prawdopodobnie nie istnieją w tabeli `i18n_translations`:
- `teamContacts.historyTitle` (widoczny na screenie!)
- `teamContacts.created`, `teamContacts.updated`, `teamContacts.deleted`
- `teamContacts.noHistory`
- I prawdopodobnie wiele innych z namespace `teamContacts.*`

---

## Plan implementacji (3 fazy)

### Faza 1: Naprawić brakujące klucze w DB + TeamContactHistoryDialog (krytyczne)

**Problem**: Klucze `teamContacts.*` są używane w kodzie ale nie istnieją w bazie. Dialog historii wyświetla surowe klucze.

**Rozwiązanie**: Dodać migrację SQL wstawiającą brakujące klucze do `i18n_translations` dla języka domyślnego (pl) oraz dostępnych języków (en, de, no).

Klucze do dodania:
- `teamContacts.historyTitle` → "Historia zmian"
- `teamContacts.created` → "Utworzono"
- `teamContacts.updated` → "Zaktualizowano"
- `teamContacts.deleted` → "Usunięto"
- `teamContacts.noHistory` → "Brak historii zmian"
- `teamContacts.eventInvite` → "Zaproszono na wydarzenie"
- `teamContacts.eventInviteReg` → "Zaproszony przez partnera"
- `teamContacts.eventRegistration` → "Samodzielna rejestracja"
- `teamContacts.eventInviteAltEmail` → "Wysłano na inny email"
- `teamContacts.eventInviteResend` → "Ponowne wysłanie"
- `teamContacts.altEmail` → "Alternatywny email"
- `teamContacts.joined` → "Dołączył"
- `teamContacts.notJoined` → "Nie dołączył"

**Plik**: Migracja SQL + aktualizacja `TeamContactHistoryDialog.tsx` aby używać kluczy zamiast hardkodowanych stringów.

### Faza 2: Dodać `useLanguage` do wszystkich plików team-contacts

Dodać `tf()` do 12 plików bez tłumaczeń, zastępując hardkodowane polskie stringy kluczami z fallbackami:

```ts
// Przykład: zamiast "Dodaj kontakt"
tf('teamContacts.addContact', 'Dodaj kontakt')
```

**Pliki** (12 komponentów):
- `TeamContactsTab.tsx` — nagłówki, przyciski, taby
- `TeamContactFilters.tsx` — etykiety filtrów
- `PrivateContactForm.tsx` — etykiety formularza, statusy
- `TeamContactForm.tsx` — etykiety formularza
- `TeamContactExport.tsx` — etykiety eksportu
- `TeamMap.tsx` — komunikaty puste
- `ContactEventInfoButton.tsx` — "Dołączył"/"Nie dołączył" 
- `ContactEventHistory.tsx` — "Samodzielna rejestracja"
- `ContactExpandedDetails.tsx` — etykiety pól
- `DeletedContactsList.tsx` — nagłówek
- `EventGroupedContacts.tsx` — dialogi
- `InviteToEventDialog.tsx` — etykiety

Klucze dodane z `tf(key, fallback)` — dzięki temu nawet jeśli klucz nie istnieje w DB, wyświetli się fallback po polsku.

### Faza 3: Dodać migrację z pełnym zestawem kluczy PL + EN + DE + NO

Migracja SQL dodająca ~50-60 kluczy tłumaczeń dla namespace `teamContacts.*` w 4 językach. System `scheduled-translate-sync` automatycznie uzupełni brakujące tłumaczenia dla dodatkowych języków.

**Dodatkowe naprawy**:
- `EventDetailsDialog.tsx` — zamienić hardkodowane `pl/enUS` na `getAppDateLocale(language)`
- `CronJobsManagement.tsx` — zamienić `language === 'pl' ? pl : enUS` na `getAppDateLocale(language)`

---

## Pliki do edycji (podsumowanie)

| Plik | Zmiana |
|------|--------|
| **NOWA migracja SQL** | Wstawienie ~60 kluczy tłumaczeń teamContacts.* |
| `TeamContactHistoryDialog.tsx` | Użycie kluczy tf() dla badge'ów |
| `TeamContactsTab.tsx` | Dodanie useLanguage + tf() |
| `TeamContactFilters.tsx` | Dodanie useLanguage + tf() |
| `PrivateContactForm.tsx` | Dodanie useLanguage + tf() |
| `TeamContactForm.tsx` | Dodanie useLanguage + tf() |
| `TeamContactExport.tsx` | Dodanie useLanguage + tf() |
| `TeamMap.tsx` | Dodanie useLanguage + tf() |
| `ContactEventInfoButton.tsx` | Zamiana hardkodowanych na tf() |
| `ContactEventHistory.tsx` | Dodanie useLanguage + tf() |
| `ContactExpandedDetails.tsx` | Dodanie useLanguage + tf() |
| `DeletedContactsList.tsx` | Dodanie useLanguage + tf() |
| `EventGroupedContacts.tsx` | Dodanie useLanguage + tf() |
| `InviteToEventDialog.tsx` | Dodanie useLanguage + tf() |
| `EventDetailsDialog.tsx` | getAppDateLocale zamiast hardkodowanego locale |
| `CronJobsManagement.tsx` | getAppDateLocale zamiast hardkodowanego locale |

## Bezpieczeństwo

- Użycie `tf(key, fallback)` gwarantuje że nawet bez klucza w DB wyświetli się poprawny fallback
- Żadne zmiany nie dotykają logiki biznesowej, RLS, ani autentykacji
- Admin panel pozostaje po polsku (świadoma decyzja architektoniczna)

