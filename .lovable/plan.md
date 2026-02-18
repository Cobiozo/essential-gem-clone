
# Rozszerzenie VideoGrid: wskaznik glosnosci mikrofonu, poprawne przelaczanie mowcy, tryby wyswietlania

## Zakres zmian

### 1. Zielony wskaznik mikrofonu z poziomem glosnosci

Aktualnie hook `useActiveSpeakerDetection` zwraca tylko indeks mowcy. Trzeba go rozszerzyc, aby zwracal rowniez **mape poziomow audio** dla kazdego uczestnika (wartosc 0-1). Ta informacja bedzie uzywana do:

- Wyswietlania zielonej ikony mikrofonu na VideoTile i ThumbnailTile gdy uczestnik mowi (poziom > prog)
- Animowania ikony mikrofonu (np. zmiana rozmiaru/jasnosci w zaleznosci od glosnosci)
- Zielonej ramki wokol miniaturki mowiacego uczestnika (juz czesciowo istnieje)

**Zmiany w `useActiveSpeakerDetection`:**
- Zwracac obiekt `{ speakingIndex, audioLevels: Map<string, number> }` zamiast samego indeksu
- Analizowac rowniez lokalnego uczestnika (usunac warunek `if (p.isLocal) return`) zeby pokazywac zielony mikrofon tez dla uzytkownika lokalnego
- Normalizowac poziom audio do zakresu 0-1

**Zmiany w VideoTile i ThumbnailTile:**
- Dodac prop `audioLevel: number` (0-1)
- Gdy `audioLevel > 0.1` i uczestnik NIE jest wyciszony: pokazac zielona ikone mikrofonu z animacja (pulsujaca lub ze zmiennymi "fala" paskami)
- Na glownym VideoTile: zielony mikrofon obok nazwy uczestnika w overlay
- Na ThumbnailTile: zielona ramka (istnieje) + maly zielony mikrofon

### 2. Poprawne automatyczne przelaczanie na mowce

Aktualny hook pomija lokalnego uczestnika przy detekcji. To jest poprawne - nie chcemy przelaczac glownego widoku na siebie gdy mowimy. Ale trzeba sprawdzic:

- Usunac debounce 1.5s ktory jest za dlugi - zmienic na 800ms dla plynniejszego przelaczania
- Dodac `manualActiveIndex` reset po 5 sekundach ciszy (zeby po recznym wyborze uczestnika system wroci do auto-przelaczania gdy ktos inny zacznie mowic)
- Poprawic prog detekcji z 15 na 10 (bardziej czuly)

### 3. Tryby wyswietlania uczestnikow

Dodac przelacznik trybow widoku widoczny na screenshocie:

- **Mowca** (obecny tryb) - duzy obraz aktywnego mowcy + miniaturki na dole
- **Galeria** - siatka rownych kafelkow (jak Zoom gallery view), kazdy uczestnik ma taki sam rozmiar
- **Wielu mowcow** - 2-3 ostatnio mowiacych uczestnikow pokazanych w duzych kafelkach obok siebie
- **Immersja** - pelny ekran aktywnego mowcy bez miniaturek i paska kontrolnego

**Nowe komponenty/zmiany:**

W `VideoGrid.tsx`:
- Dodac prop `viewMode: 'speaker' | 'gallery' | 'multi-speaker' | 'immersive'`
- Renderowac odpowiedni layout w zaleznosci od trybu
- Galeria: `grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4` z rownymi kafelkami
- Wielu mowcow: flex z 2-3 duzymi kafelkami (ostatni mowcy)
- Immersja: tylko VideoTile na pelny ekran, bez overlay

W `MeetingControls.tsx`:
- Dodac przycisk "Widok" z dropdown menu (4 opcje jak na screenshocie)
- Ikony: LayoutGrid, Grid3x3, Users, Maximize (z lucide-react)

W `VideoRoom.tsx`:
- Dodac state `viewMode` i przekazac do VideoGrid i MeetingControls

## Zmieniane pliki

1. **`src/components/meeting/VideoGrid.tsx`** - rozszerzenie hooka audio, nowe tryby layoutu, wskaznik mikrofonu
2. **`src/components/meeting/MeetingControls.tsx`** - przycisk przelaczania trybu widoku z dropdown
3. **`src/components/meeting/VideoRoom.tsx`** - state viewMode, przekazanie do komponentow
4. **`src/components/meeting/ParticipantsPanel.tsx`** - dodanie wskaznika glosnosci mikrofonu (zielony kolor gdy mowi)

## Szczegoly techniczne

### Hook useActiveSpeakerDetection - nowy zwracany typ
```typescript
interface SpeakerDetection {
  speakingIndex: number;
  audioLevels: Map<string, number>; // peerId -> level 0-1
}
```

### Wskaznik mikrofonu - komponent
Zielona ikona Mic z lucide-react, z opacity proporcjonalna do poziomu audio. Gdy poziom > 0.1 - zielony, gdy wyciszony - czerwony MicOff (jak teraz).

### Layout trybow
- Speaker: obecny layout (bez zmian)
- Gallery: CSS Grid z `auto-fill` i `minmax(200px, 1fr)`
- Multi-speaker: flex z max 3 duzymi kafelkami, reszta w miniaturkach
- Immersive: fullscreen aktywnego mowcy, hover pokazuje kontrolki

### Dropdown widoku
Uzyc komponentu Popover lub DropdownMenu z radix-ui (juz zainstalowane). Menu z 4 opcjami, kazda z ikona i nazwa jak na screenshocie.
