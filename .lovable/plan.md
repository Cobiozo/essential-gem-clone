## 1. Zmiana formatu kodu OTP: `ZW-XXXXXX` → `BW-XXXX` (4 cyfry)

**`supabase/functions/generate-hk-otp/index.ts`**
- Funkcja `generateOTPCode()`: prefix `BW-`, 4 znaki tylko z cyfr (`'0123456789'`). Komentarz nagłówka aktualizuję do „BW = Biznes/Wiedza" (lub krótko „BW").
- Limit pętli unikalności zostawiam, ale **podnoszę `maxAttempts` z 10 do 50** — przestrzeń 10 000 kombinacji jest mała, kolizje będą częstsze.

**`supabase/functions/validate-hk-otp/index.ts`** (linie 39–44)
- Normalizacja: strip prefiksu `BW-` zamiast `ZW-`. Zachowuję **backward compatibility** — jeśli wejście zaczyna się od `ZW`, akceptujemy je tak samo (stare kody w bazie nadal działają). Buduję obie warianty (`BW-…`, `ZW-…`) i szukam po `IN (...)`.

**`src/pages/HealthyKnowledgePublicPage.tsx`** (linie 84–85, 184–185, 422–426)
- Input: prefix `BW-` w UI i przy formatowaniu wysyłki. Przy normalizacji wejścia akceptuję zarówno `BW` jak i `ZW` (dla starych kodów).
- Tekst „Kod w formacie: BW-XXXX" + statyczny prefix `BW-` w polu.
- Pole input długość maks 4 znaki cyfr (`inputMode="numeric"`, `pattern="\d{4}"`).

**Bez migracji DB.** Kolumna `hk_otp_codes.code` to `text`, nowy format zmieści się bez zmian schematu. Stare rekordy `ZW-…` zostaną nietknięte i wciąż walidują się przez fallback w `validate-hk-otp`.

**Komunikaty i etykiety w aplikacji**:
- W `HKMaterialContactsList` i innych widokach kod jest wyświetlany surowo (`s.otp_code`) — nic nie zmieniam, prefix po prostu zmieni się dla nowych kodów.

## 2. Poprawa wyglądu listy „Usunięte kontakty"

**Problem (widoczny na screenie 390px):** w `DeletedContactsList.tsx` po dodaniu drugiego przycisku „Usuń trwale" obok „Przywróć", blok akcji (`shrink-0`) zajmuje ponad połowę szerokości, a kolumna z imieniem/e-mailem zostaje ściśnięta do 1 znaku — tekst łamie się litera po literze pionowo.

**`src/components/team-contacts/DeletedContactsList.tsx`** — przebudowa kafelka:
- Każdy wiersz: `flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3` zamiast obecnego `flex items-center justify-between gap-4`.
- Sekcja info dostaje `min-w-0` + `break-words`, e-mail/telefon w osobnych liniach z `truncate` na mobile, by długie maile nie rozsadzały kafelka.
- Sekcja akcji na mobile (`flex w-full sm:w-auto`): przyciski na całą szerokość (`flex-1 sm:flex-none`), żeby były ergonomiczne pod kciuk; na ≥sm wracają do auto-szerokości jak teraz.
- Drobna kosmetyka: nazwisko `text-base font-semibold`, badge `text-[10px]` z whitespace-nowrap, oddzielony delikatnym separatorem od metadanych. Padding kafelka `p-4` zamiast `p-3` dla oddechu.

## Bez zmian
- Schema `hk_otp_codes`, RLS, indeksy.
- Logika sesji, e-maile, szablony powitalne.
- Reszta zakładek CRM.
