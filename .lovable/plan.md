

## Naprawa 5 problemow w PLC Omega Base

### Problem 1: Wybrano 5 wynikow, otrzymano 9

**Przyczyna**: Blad synchronizacji stanu (race condition). W `OmegaBasePage` efekt `useEffect` na liniach 77-100 wywoluje `setResultsCount(num)` i zaraz potem `sendMessage(q)`. Ale `sendMessage` jest `useCallback` ktory przechwytuje stara wartosc `resultsCount` (domyslnie 10) z zamkniecia (closure) - nowa wartosc jeszcze nie dotarla do stanu React.

**Rozwiazanie**: Zmienic `sendMessage` w `useMedicalChatStream.ts` aby przyjmowalo opcjonalny parametr `overrideResultsCount`. Gdy wywolywane z URL params, przekazac wymagana liczbe bezposrednio:

```text
sendMessage(q, num)   // zamiast setResultsCount(num); sendMessage(q);
```

Zmiany w:
- `src/hooks/useMedicalChatStream.ts` - dodac parametr `overrideResultsCount?: number` do `sendMessage`, uzyc go zamiast stanu gdy podany
- `src/pages/OmegaBasePage.tsx` - przekazac resultsCount bezposrednio przy wywolaniu z URL params

### Problem 2: Lista rozwijana z iloscia wynikow rozni sie miedzy widgetem a pelna strona

**Przyczyna**: Widget (`MedicalChatWidget.tsx`) ma opcje `[5, 10, 15, 20, 25, 30]`, pelna strona (`OmegaBasePage.tsx`) ma `[1, 5, 10, 20, 30, 40, 50, Maks.]`.

**Rozwiazanie**: Ujednolicic opcje w obu miejscach do tego samego zestawu: `[1, 5, 10, 20, 30, 40, 50, Maks.]`. Zmienic widget aby uzywac tych samych opcji co pelna strona.

Zmiany w:
- `src/components/MedicalChatWidget.tsx` - zaktualizowac opcje Select do `[1, 5, 10, 20, 30, 40, 50]` z dodatkowa opcja "Maks." (wartosc 0)

### Problem 3: Historia wyszukiwania nie jest zapamietywana

**Przyczyna**: Historia jest zapisywana w tabeli `medical_chat_history` i ladowana w `useMedicalChatStream` tylko przy montowaniu komponentu. Widget tworzy osobna instancje hooka wiec laduje historie poprawnie. Problem moze dotyczyc braku `Authorization` header w wywolaniu `sendMessage` - zapytanie do edge function `medical-assistant` nie ma headera Auth, wiec `saveChatHistory` w hooku uzywa `supabase.from('medical_chat_history').insert()` co wymaga zalogowanego uzytkownika.

Sprawdzenie: RLS wymaga `auth.uid() = user_id`, insert policy nie ma `qual` (brak warunku WITH CHECK) - to moze byc problem. Dodam `WITH CHECK (auth.uid() = user_id)` do polityki INSERT.

Dodatkowa zmiana: po udanym `saveChatHistory`, odswiezyc liste historii takze w widgecie (wywolac `loadChatHistory` po kazdym zapisie).

Zmiany w:
- SQL: dodac WITH CHECK do INSERT policy
- `src/hooks/useMedicalChatStream.ts` - upewnic sie ze `loadChatHistory` jest wywolywane po zapisie (juz jest, linia 78)

### Problem 4: Tytuly czesci odpowiedzi za male - potrzebna wieksza czcionka

**Przyczyna**: Funkcja `renderMessageContent` w `OmegaBasePage.tsx` nie obsluguje nagłówków markdown (`##`). Konwertuje tylko `**bold**` na `<strong>` i `\n` na `<br>`. Naglowki typu `## 🔬 CZĘŚĆ 1: ANALIZA NAUKOWA` sa renderowane jako zwykly tekst.

**Rozwiazanie**: Dodac parsowanie nagłówków `##` i `###` w `renderMessageContent` / w `renderBareUrls`, konwertujac je na elementy HTML z odpowiednimi rozmiarami czcionek:
- `## heading` -> `<h2>` z wieksza czcionka (np. `text-lg font-bold text-[#D4AF37]`)  
- `### heading` -> `<h3>` z lekko wieksza czcionka

Zmiany w:
- `src/pages/OmegaBasePage.tsx` - rozszerzyc logike renderowania o naglowki, dodajac parsowanie linii `## ` i `### ` przed pozostalym przetwarzaniem

### Problem 5: PDF jasny i nieczytelny

**Przyczyna**: Funkcja `generatePdfBody` (linia 336) ustawia `color:#333` (ciemnoszary) co w polaczeniu z renderowaniem html2canvas (rasteryzacja) moze dawac slaba jakosc. Ponadto `font-size:12px` na kontenerze (linia 346) jest za maly, a `font-size:11pt` w body daje rozbieznosc.

**Rozwiazanie**:
- Zmienic kolor tekstu na `#000000` (czarny) w `generatePdfBody`
- Zwiekszyc `font-size` na kontenerze z `12px` na `14px`
- Zwiekszyc `scale` w html2canvas z `2` na `3` dla lepszej jakosci
- Ustawic jasne tlo i ciemny tekst explicite na kontenerze
- Dodac `-webkit-font-smoothing: antialiased` do kontenera

Zmiany w:
- `src/pages/OmegaBasePage.tsx` - zaktualizowac `generatePdfBody` i `generatePdfFromHtml`

---

### Podsumowanie zmian w plikach

| Plik | Zmiana |
|------|--------|
| `src/hooks/useMedicalChatStream.ts` | Dodac `overrideResultsCount` parametr do `sendMessage` |
| `src/pages/OmegaBasePage.tsx` | 1) Przekazac resultsCount z URL do sendMessage, 2) Dodac parsowanie nagłówków ## w renderMessageContent, 3) Poprawic PDF (ciemniejszy tekst, wieksza czcionka, lepszy scale) |
| `src/components/MedicalChatWidget.tsx` | Ujednolicic opcje wynikow z pelna strona |
| SQL | Dodac WITH CHECK do INSERT policy na `medical_chat_history` |

