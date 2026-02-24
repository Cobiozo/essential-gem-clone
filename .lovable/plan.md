

## Zapamietywanie wynikow wyszukiwania po odswiezeniu strony

### Problem

Gdy uzytkownik odswieza strone `/omega-base?q=pytanie`, stan komponentu (messages) resetuje sie do pustego, a `useEffect` ponownie wysyla zapytanie z parametru URL `q`. Caly proces wyszukiwania powtarza sie niepotrzebnie.

### Rozwiazanie

Uzycie `sessionStorage` do przechowywania wynikow wyszukiwania. Po zakonczeniu streamowania odpowiedzi, wiadomosci zostana zapisane w `sessionStorage`. Przy ladowaniu strony, jesli istnieja zapisane wiadomosci dla tego samego zapytania, zostana one odtworzone zamiast ponownego wyszukiwania.

### Szczegoly techniczne

**Plik: `src/pages/OmegaBasePage.tsx`**

Zmiany w logice inicjalizacji (useEffect na liniach 74-85):

1. Przy ladowaniu strony sprawdzic `sessionStorage` pod kluczem `omega-base-session`
2. Jesli zapisane dane istnieja i zapytanie `q` pasuje do zapisanego zapytania -- odtworzyc wiadomosci ze storage zamiast wysylac nowe zapytanie
3. Jesli nie ma danych lub zapytanie jest inne -- wyslac nowe zapytanie jak dotychczas

**Plik: `src/hooks/useMedicalChatStream.ts`**

Dodanie:
- Nowej funkcji `setMessagesDirectly(msgs: MedicalChatMessage[])` do ustawiania wiadomosci bez wysylania zapytania (do odtwarzania z cache)
- Hook zwraca dodatkowa funkcje `setMessagesDirectly`

**Plik: `src/pages/OmegaBasePage.tsx`**

Dodanie:
- `useEffect` ktory zapisuje wiadomosci do `sessionStorage` po kazdej zmianie (tylko gdy sa wiadomosci z trescia)
- Klucz storage: `omega-base-session` z wartoscia `{ query: string, messages: MedicalChatMessage[], resultsCount: number }`
- Przy `clearMessages` rowniez czyszczenie `sessionStorage`
- Przy `loadFromHistory` nadpisanie storage nowym kontekstem

### Przeplyw

```text
[Uzytkownik wchodzi na /omega-base?q=pytanie]
  |
  v
[Sprawdz sessionStorage]
  |
  +-- Jest cache z tym samym q? --> Odtworz wiadomosci, nie wysylaj zapytania
  |
  +-- Brak cache lub inne q? --> Wyslij zapytanie, zapisz wynik do sessionStorage
  |
  v
[Uzytkownik odswieza strone]
  |
  v
[Cache istnieje --> Odtworzenie wynikow bez ponownego wyszukiwania]
```

### Czyszczenie cache

- Klikniecie "kosza" (clearMessages) czysci rowniez sessionStorage
- Zamkniecie karty/przegladarki automatycznie czysci sessionStorage (wbudowane zachowanie)
- Nowe zapytanie nadpisuje stary cache

