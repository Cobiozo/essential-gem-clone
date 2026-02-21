

# Certyfikat: automatyczne pobieranie, email z kopia, usuwanie pliku, blokada z informacja

## Przeplyw

```text
Uzytkownik ukonczyl szkolenie (100%)
   |
   v
Widzi przycisk "Wygeneruj"
   |
   v  [klikniecie]
   |
1. PDF generowany lokalnie (jsPDF)
2. PDF uploadowany do storage
3. PDF automatycznie pobierany na komputer uzytkownika
4. Email z PDF (link) wyslany do uzytkownika
5. Kopia emaila wyslana na support@purelife.info.pl
6. Daty generated_at i email_sent_at zapisane w certificates
7. Plik PDF USUNIETY ze storage (po uplywie emaila)
   |
   v
Przy ponownym wejsciu widzi:
- Komunikat: "Certyfikat wygenerowany dnia X. Email wyslany dnia Y."
- Instrukcja: sprawdz skrzynke/spam, kontakt przez Wsparcie i Pomoc
- Przycisk "Regeneruj" (dostepny raz na 24h, potem info o kontakcie z supportem)
```

## Zmiany w bazie danych

Migracja SQL - dodanie kolumn do tabeli `certificates`:

```sql
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ;
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS last_regenerated_at TIMESTAMPTZ;
```

Istniejace certyfikaty automatycznie dostana `generated_at = NOW()` (default). `email_sent_at` i `last_regenerated_at` beda NULL dla starych rekordow.

## Zmiany w plikach

### 1. `src/hooks/useCertificateGeneration.ts`

Po wygenerowaniu i uploadzie PDF:
- Pobrac blob PDF i automatycznie uruchomic pobieranie w przegladarce (createElement('a'), click, revokeObjectURL)
- Dodac `generated_at: new Date().toISOString()` do insertu certyfikatu
- Po wyslaniu emaila: zaktualizowac `email_sent_at` w tabeli certificates
- Po wszystkim: usunac plik PDF ze storage i ustawic `file_url = 'downloaded-and-deleted'`
- Zwrocic dodatkowe pola w rezultacie: `generatedAt`, `emailSentAt`

Przy regeneracji (`forceRegenerate = true`):
- Ustawic `last_regenerated_at` na rekordzie certyfikatu

### 2. `supabase/functions/send-certificate-email/index.ts`

- Po wyslaniu emaila do uzytkownika, wyslac **drugi email** na `support@purelife.info.pl` z ta sama trescia i linkiem do certyfikatu
- Zaktualizowac kolumne `email_sent_at` w tabeli `certificates` po pomyslnej wysylce
- Zwrocic `emailSentAt` w odpowiedzi JSON

### 3. `src/pages/Training.tsx`

**fetchCertificates**: Pobierac dodatkowe kolumny `generated_at`, `email_sent_at`, `last_regenerated_at`. Rozszerzyc typ stanu certificates.

**Sekcja certyfikatu (linie 766-848)**: Calkowicie przebudowac logike wyswietlania:

- **Gdy certyfikat NIE istnieje**: przycisk "Wygeneruj" (jak dotychczas)
- **Gdy certyfikat istnieje (wygenerowany)**: 
  - Komunikat informacyjny z datami: "Certyfikat zostal wygenerowany dnia [data]. Email z certyfikatem wyslany dnia [data]."
  - Instrukcja: "Sprawdz skrzynke poczty email oraz folder spam. Jesli nie znalazles wiadomosci, skontaktuj sie poprzez formularz w zakladce Wsparcie i Pomoc z Support Pure Life Center."
  - Przycisk "Regeneruj certyfikat":
    - Jesli `last_regenerated_at` jest w ciagu ostatnich 24h: przycisk zablokowany, tekst "Regeneracja mozliwa po [data+24h]. Skontaktuj sie przez formularz w zakladce Wsparcie i Pomoc."
    - Jesli minelo >24h lub nigdy nie regenerowano: przycisk aktywny z AlertDialog potwierdzenia
    - Po regeneracji: automatyczne pobranie + email + aktualizacja `last_regenerated_at`

**handleGenerateCertificate**: Po sukcesie, odswiezyc certyfikaty i wyswietlic toast z informacja o pobraniu i emailu.

**handleRegenerateCertificate**: Sprawdzic 24h cooldown przed wywolaniem. Ustawic `last_regenerated_at`.

**Usunac przycisk "Pobierz certyfikat"**: Po pierwszym wygenerowaniu plik jest pobierany automatycznie i usuwany ze storage — nie ma czego pobierac ponownie.

## Wplyw na istniejacy kod

- Przycisk "Pobierz" znika — plik nie jest przechowywany w storage po wygenerowaniu
- Regeneracja ograniczona do raz na 24h — po tym kontakt z supportem
- Kopia emaila zawsze trafia na support@purelife.info.pl
- Istniejace certyfikaty (bez generated_at/email_sent_at) beda traktowane jako wygenerowane bez daty — pokaza "data nieznana"
- Nie wymaga zmian w RLS ani edge function `get-certificate-url` (nie bedzie juz uzywany do pobierania)

