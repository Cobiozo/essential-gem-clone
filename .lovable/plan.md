

# Naprawa bledu "new row violates row-level security policy" przy generowaniu certyfikatu

## Przyczyna

Blad wystepuje przy uploadzie PDF do storage. Polityka RLS bucketa `certificates` wymaga roli `authenticated`, ale podczas dlugiego procesu generowania PDF (ladowanie obrazow, renderowanie elementow) token JWT moze wygasnac. Kod odswiezy sesje przed uploadem (linia 396), ale **kontynuuje nawet jesli odswiezenie sie nie powiedzie** — przez co upload uzywa wygaslego tokena i RLS blokuje operacje.

Dodatkowo flaga `upsert: true` w storage upload jest niepotrzebna (kazda sciezka pliku ma unikalny timestamp) i moze powodowac dodatkowe problemy z politykami UPDATE.

## Zmiana

Plik: `src/hooks/useCertificateGeneration.ts`

1. Po odswiezeniu sesji (linia 396-399) — dodac weryfikacje ze uzytkownik jest nadal zalogowany. Jesli `auth.getUser()` zwraca blad lub brak uzytkownika, rzucic czytelny blad zamiast kontynuowac z wygaslym tokenem.

2. Zmienic `upsert: true` na `upsert: false` w storage upload (linia 411) — kazdy upload ma unikalny timestamp w nazwie pliku, wiec nie ma potrzeby nadpisywania.

3. Dodac zapasowe odswiezenie sesji — jesli pierwsze odswiezenie zawiedzie, sprobowac `getSession()` aby wymusic pobranie aktualnego tokena.

```text
// Obecny kod (linie 394-399):
console.log('Step 4c: Refreshing session before upload...');
const { error: refreshError } = await supabase.auth.refreshSession();
if (refreshError) {
  console.warn('Session refresh failed:', refreshError);
}

// Nowy kod:
console.log('Step 4c: Refreshing session before upload...');
const { error: refreshError } = await supabase.auth.refreshSession();
if (refreshError) {
  console.warn('Session refresh failed, trying getSession...', refreshError);
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData?.session) {
    throw new Error('Sesja wygasla. Zaloguj sie ponownie i sprobuj jeszcze raz.');
  }
}
// Verify user is still authenticated
const { data: currentUser } = await supabase.auth.getUser();
if (!currentUser?.user) {
  throw new Error('Sesja wygasla. Zaloguj sie ponownie i sprobuj jeszcze raz.');
}

// Linia 411: upsert: true -> upsert: false
```

## Wplyw

- Uzytkownik dostanie czytelny komunikat "Sesja wygasla" zamiast technicznego bledu RLS
- Brak ryzyka bledow z `upsert` na istniejacych plikach
- Istniejacy przeplyw nie zmienia sie gdy sesja jest aktywna

