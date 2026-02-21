
# Naprawa szkolenia BIZNESOWE (0/0 lekcji) i bledu generowania certyfikatow

## Zidentyfikowane problemy

### Problem 1: BIZNESOWE pokazuje 0/0 lekcji
Certyfikat dla modulu BIZNESOWE zostal wydany 5 stycznia o 01:31, ale WSZYSTKIE 21 lekcji zostaly utworzone POZNIEJ tego samego dnia (od 15:08). Kod w `Training.tsx` (linia 460-467) filtruje lekcje warunkiem `created_at <= certDate`, co wyklucza wszystkie lekcje i daje wynik 0/0.

Uzytkownik ukonczyl 21/21 lekcji, ale system pokazuje "Brak lekcji" z powodu blednego filtrowania temporalnego.

### Problem 2: Blad RLS przy generowaniu certyfikatu
Blad "Upload error: new row violates row-level security policy" wystepuje przy uploadzie PDF do storage. Przyczyna: generowanie certyfikatu wykonuje duzo operacji asynchronicznych (ladowanie profilu, szablonu, czcionek, obrazow, renderowanie PDF) ktore moga trwac 10-30 sekund. W tym czasie token JWT moze wygasnac, co powoduje ze `auth.uid()` zwraca NULL i polityka RLS na `storage.objects` odrzuca upload.

Polityka wymaga: `foldername(name)[1] = auth.uid()::text` — jesli sesja wygasla, `auth.uid()` jest NULL i warunek nie jest spelniony.

## Plan napraw

### 1. Training.tsx — naprawic filtrowanie lekcji po dacie certyfikatu

W logice obliczania `relevantLessonsCount` (linia 460-467), dodac zabezpieczenie: jesli filtrowanie po dacie certyfikatu daje 0 lekcji, ale modul ma aktywne lekcje, uzyc pelnej liczby lekcji. To obsluguje przypadek gdy certyfikat predatuje wszystkie lekcje (np. z testowania).

```text
// Obecna logika (linia 460-467):
let relevantLessonsCount = lessonsData?.length || 0;
if (certIssuedAt && lessonsData) {
  const certDate = new Date(certIssuedAt);
  relevantLessonsCount = lessonsData.filter(l => 
    new Date(l.created_at) <= certDate
  ).length;
}

// Nowa logika:
let relevantLessonsCount = lessonsData?.length || 0;
if (certIssuedAt && lessonsData) {
  const certDate = new Date(certIssuedAt);
  const filtered = lessonsData.filter(l => new Date(l.created_at) <= certDate).length;
  // Jesli filtrowanie daje 0 ale sa lekcje, certyfikat predatuje cala zawartosc — uzyj pelnej liczby
  if (filtered > 0) {
    relevantLessonsCount = filtered;
  }
}
```

Ta sama zmiana dla `completedLessons` (linia 484-492) — analogicznie nie filtrowac po dacie gdy daloby to 0.

### 2. useCertificateGeneration.ts — odswiezyc sesje przed uploadem

Dodac odswiezenie sesji (`supabase.auth.refreshSession()`) bezposrednio PRZED uploadem do storage (przed linia 400). To zapewni ze token JWT jest aktualny po dlugiej operacji generowania PDF.

```text
// Przed uploadem - odswiezyc sesje (generowanie PDF moglo trwac dlugo)
console.log('Step 4c: Refreshing session before upload...');
const { error: refreshError } = await supabase.auth.refreshSession();
if (refreshError) {
  console.warn('Session refresh failed:', refreshError);
}
```

## Pliki do zmiany

| Plik | Zmiana |
|---|---|
| `src/pages/Training.tsx` | Zabezpieczyc filtrowanie lekcji i postepu po dacie certyfikatu — gdy wynik = 0, uzyc pelnej liczby |
| `src/hooks/useCertificateGeneration.ts` | Dodac `refreshSession()` przed uploadem PDF do storage |

## Wplyw na istniejacy kod

- Nie zmienia logiki dla certyfikatow wydanych PO utworzeniu lekcji — te dzialaja poprawnie
- Nie narusza bezpieczenstwa — odswiezanie sesji to standardowa operacja Supabase
- Nie wymaga zmian w bazie danych, storage ani RLS
