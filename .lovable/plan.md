

## Animacja omega-coin-flip: timer zamiast ciaglej petli CSS

Obecna animacja uzywa `animation: omega-coin-flip 60s linear infinite` -- ciaglej petli CSS. Uzytkownik chce **pojedynczy obrot co 12 sekund** sterowany timerem JavaScript.

### Podejscie

Zamiast klasy `animate-omega-coin-flip` w Tailwindzie, przycisk bedzie sterowal animacja przez `useEffect` + `setInterval`:

1. Co 12 sekund dodaje klase CSS uruchamiajaca obrot (2s, 360 stopni)
2. Po 2 sekundach klasa jest usuwana -- przycisk stoi nieruchomo
3. Po kolejnych 10 sekundach cykl sie powtarza

### Zmiany

**1. `tailwind.config.ts`** -- zmiana keyframes i animacji:

```text
Keyframes:
"omega-coin-flip": {
  "0%": { transform: "rotateY(0deg)" },
  "100%": { transform: "rotateY(360deg)" },
}

Animation:
"omega-coin-flip": "omega-coin-flip 2s ease-in-out forwards"
```

- 360 stopni (jeden obrot)
- 2 sekundy
- `forwards` -- zatrzymuje sie na koncu
- Bez `infinite`

**2. `src/components/MedicalChatWidget.tsx`** -- logika timera:

- Usunac klase `animate-omega-coin-flip` z przycisku
- Dodac `useState` + `useEffect` z `setInterval(12000)`:
  - Ustawia flage `isSpinning = true` --> dodaje klase `animate-omega-coin-flip`
  - Po 2s ustawia `isSpinning = false` --> usuwa klase
- Przycisk dostaje klase warunkowo: `isSpinning && 'animate-omega-coin-flip'`
- Zachowane `perspective: 600px` i `transformStyle: preserve-3d`

### Cykl koncowy

```text
[0s]   obrot start (2s)
[2s]   obrot koniec, stop
[12s]  obrot start (2s)
[14s]  obrot koniec, stop
[24s]  ...
```

