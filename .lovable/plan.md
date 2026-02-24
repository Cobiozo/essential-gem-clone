

## Zmiana: Usunięcie asystenta Pure Life Center, przekształcenie Pure Science Search AI w "PLC Omega Base" z pełnostronicowym widokiem

### Co zostanie zrobione

1. **Usunięcie asystenta Pure Life Center** (ChatWidget) -- zolty przycisk czatu w prawym dolnym rogu
2. **Zmiana nazwy** "PURE SCIENCE SEARCH AI" na "PLC Omega Base" we wszystkich miejscach (UI, eksporty, tlumaczenia)
3. **Pulsujaca i delikatnie skaczaca ikona** -- zastapienie obecnej animacji `animate-gold-glow` nowa animacja laczaca pulsowanie z delikatnym skokiem (bounce)
4. **Pelnostronicowy widok po wpisaniu pytania** -- po kliknieciu ikony i wpisaniu pytania, nawigacja do dedykowanej strony `/omega-base` z pelnym interfejsem czatu
5. **Klikalne linki w odpowiedziach** -- upewnienie sie, ze wszystkie linki (PubMed, DOI, inne zrodla) sa klikalne i otwieraja sie w nowej karcie

---

### Szczegoly techniczne

| Plik | Zmiana |
|------|--------|
| `src/components/ChatWidget.tsx` | Bez zmian -- plik pozostaje ale nie jest juz montowany |
| `src/App.tsx` | Usunięcie `ChatWidget` z `ChatWidgetsWrapper`, zamiana `MedicalChatWidget` na logike z ikona + nawigacja, dodanie Route `/omega-base` |
| `src/components/MedicalChatWidget.tsx` | Podzial na 2 czesci: (A) `OmegaBaseFloatingButton` -- pulsujaca ikona z inputem, po submit przekierowuje na `/omega-base?q=...`, (B) przeksztalcenie panelu czatu w pelnostronicowy komponent |
| `src/pages/OmegaBasePage.tsx` | Nowa strona -- pelnoekranowy interfejs czatu z cala dotychczasowa funkcjonalnoscia (historia, eksport, ustawienia wynikow) |
| `tailwind.config.ts` | Dodanie nowej animacji `omega-pulse-bounce` (pulsowanie + delikatny skok) |

### Przeplyw uzytkownika

```text
[Dashboard]
    |
    v
[Ikona w prawym dolnym rogu - pulsujaca, skaczaca]
    |
    v (klikniecie)
[Maly input z polem pytania - nad ikona]
    |
    v (Enter / wyslanie)
[Nawigacja do /omega-base?q=pytanie]
    |
    v
[Pelnostronicowy interfejs czatu z odpowiedzia streamowana]
    - Wszystkie linki klikalne (target=_blank)
    - Eksport PDF/DOC/HTML
    - Historia
    - Ustawienia liczby wynikow
```

### Animacja ikony

Nowa animacja CSS laczaca pulsowanie z delikatnym skokiem:
```text
@keyframes omega-pulse-bounce:
  0%, 100%: skala 1, cien bazowy
  25%: przesuniecie w gore o 4px
  50%: skala 1.08, mocniejszy cien zloty, powrot
  75%: delikatne przesuniecie w gore o 2px
```

### Linki w odpowiedziach

Obecna funkcja `renderMessageContent` juz konwertuje linki markdown na klikalne elementy `<a>`. Dodatkowo dodam obsluge zwyklych URL-i (bez markdown) -- np. `https://pubmed.ncbi.nlm.nih.gov/12345` -- aby rowniez byly automatycznie klikalne z `target="_blank"`.

### Usuwane pliki/komponenty

- `ChatWidget` nie bedzie juz montowany w `ChatWidgetsWrapper` (plik pozostaje na wypadek przyszlego uzycia)
- Floating panel w `MedicalChatWidget` zostanie zastapiony minimalnym przyciskiem + inputem

