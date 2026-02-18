

# Redesign pokoju spotkania w stylu Zoom (mobile-first)

Na podstawie screenshotow z Zoom, interfejs pokoju spotkania zostanie calkowicie przebudowany.

## Co sie zmieni

### 1. VideoGrid.tsx - Layout jak w Zoom

Aktualnie: prosty grid z kwadratowymi kafelkami.

Nowy layout:
- **Glowny mowca** zajmuje caly ekran (full-screen video)
- **Miniaturki** innych uczestnikow w malym pasku na dole (horizontal scroll)
- Klikniecie na miniaturke przelacza glownego mowce
- Nazwa uczestnika w lewym dolnym rogu glownego video
- Ikony mikrofonu/kamery w prawym dolnym rogu glownego video
- Ciemne tlo (bg-black) zamiast bg-muted

### 2. MeetingControls.tsx - Pasek kontrolek jak w Zoom

Aktualnie: okragle przyciski bez etykiet.

Nowy design:
- Ikony z etykietami pod spodem (Mikrofon, Kamera, Czat, Uczestnicy, Opusc, Koniec)
- Ciemne tlo paska (bg-gray-900 / bg-zinc-900)
- Mikrofon/kamera: szare kolka, czerwone gdy wyciszone
- "Opusc" i "Koniec": czerwone przyciski
- Liczba uczestnikow pod ikona "Uczestnicy"
- Dodanie przycisku "Czat" (placeholder na przyszlosc)

### 3. VideoRoom.tsx - Fullscreen + ciemny motyw

- Caly pokoj na czarnym tle (bg-black)
- Gorny pasek: nazwa spotkania (lewa) + liczba uczestnikow (prawa) na ciemnym tle
- Brak bialych ramek/borderow

### 4. MeetingLobby.tsx - Drobne poprawki

- Ciemniejsze tlo podgladu kamery
- Bez zmian w logice

## Szczegoly techniczne

| Plik | Zakres zmian |
|------|-------------|
| `src/components/meeting/VideoGrid.tsx` | Pelna przebudowa: speaker view + thumbnail strip, klikanie na miniaturki, ciemny motyw |
| `src/components/meeting/MeetingControls.tsx` | Nowy layout: ikony z labelkami, Zoom-style kolorystyka, dodanie Czat placeholder |
| `src/components/meeting/VideoRoom.tsx` | Zmiana tla na czarne, aktualizacja headera (nazwa pokoju + uczestnicy), przekazanie nowych propsow |
| `src/pages/MeetingRoom.tsx` | Przekazanie nazwy wydarzenia do VideoRoom (pobranie tytulu z bazy) |

## Wizualna roznica

```text
PRZED (obecny):                    PO (Zoom-style):
+------------------+               +------------------+
| Pokoj spotkania  |               | Nazwa spk.   [2] |
+------------------+               +------------------+
| [Video] [Video]  |               |                  |
|                  |               |   GLOWNY VIDEO   |
| [Video] [Video]  |               |   (fullscreen)   |
|                  |               |                  |
+------------------+               | Imie        [mic]|
| (o)(o)(o)   [X]  |               +--[mini][mini]----+
+------------------+               | Mikr Kam Czat 2 X|
                                   +------------------+
```

