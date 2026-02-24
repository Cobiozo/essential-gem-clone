
## Przywrocenie pelnego panelu widgeta PLC Omega Base + wolniejsza animacja

### Zmiana 1: Przywrocenie pelnego panelu w `MedicalChatWidget.tsx`

Obecny widgiet pokazuje tylko maly input. Trzeba przywrocic pelny panel jak na screenie:
- Naglowek: ikona Search + "PLC OMEGA BASE" + przyciski (historia, pobieranie, kosz)
- Wiersz z wynikami: "Wyniki:" + dropdown z liczba wynikow
- Disclaimer (zolty pasek z ostrzezeniem)
- Obszar na wiadomosci (pusty domyslnie)
- Input na dole z przyciskiem wyslania

Panel otwiera sie po kliknieciu pulsujacego przycisku. Po wyslaniu pytania (Enter / klik Send), wybraniu z historii lub zmianie wynikow i wyslaniu -- nastepuje nawigacja do `/omega-base?q=...&results=N`.

Cala logika czatu (streamowanie, eksport, rendering) pozostaje na stronie `/omega-base` -- panel widgetu sluzy TYLKO jako interfejs wejsciowy.

### Zmiana 2: Bardzo wolna animacja bounce

Zmiana w `tailwind.config.ts`: wydluzenie czasu animacji `omega-pulse-bounce` z `2.5s` na `6s` (bardzo wolne pulsowanie i skoki).

### Szczegoly techniczne

| Plik | Zmiana |
|------|--------|
| `src/components/MedicalChatWidget.tsx` | Pelna przebudowa panelu: naglowek z "PLC OMEGA BASE", historia (Popover z chatHistory z hooka useMedicalChatStream), download (nawigacja do omega-base), resultsCount selector, disclaimer, input. Po submit/historia -> navigate(`/omega-base?q=...&results=N`) |
| `tailwind.config.ts` | Zmiana `omega-pulse-bounce` duration z `2.5s` na `6s` |
| `src/pages/OmegaBasePage.tsx` | Dodanie odczytu parametru `results` z URL i ustawienie `resultsCount` na starcie |

### Przeplyw

```text
[Pulsujacy przycisk - wolny bounce 6s]
  |
  v (klik)
[Panel jak na screenie: naglowek, wyniki, disclaimer, input]
  |
  v (wyslanie pytania / wybranie z historii)
[navigate("/omega-base?q=pytanie&results=10")]
  |
  v
[Pelnostronicowy interfejs z odpowiedzia]
```

### Zawartosc panelu (odtworzenie z screena)

```text
+-----------------------------------------------+
| [Q] PLC OMEGA BASE        [hist][dl][trash]   |
+-----------------------------------------------+
| Wyniki:                            [10 v]     |
+-----------------------------------------------+
| ! Ten asystent sluzy wylacznie celom          |
|   informacyjnym i nie zastepuje porady        |
|   lekarskiej.                                 |
+-----------------------------------------------+
|                                               |
|           (pusty obszar czatu)                |
|                                               |
+-----------------------------------------------+
| [Zadaj pytanie naukowe...        ] [>]        |
+-----------------------------------------------+
```
