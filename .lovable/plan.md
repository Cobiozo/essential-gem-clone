

## Wydluzenie czasu obrotu widgetu

Obecny czas obrotu to **2 sekundy**. Wydluze go do **4 sekund** -- obrot bedzie wolniejszy i bardziej elegancki.

### Zmiany

**1. `tailwind.config.ts`** -- zmiana czasu animacji z 2s na 4s:

```text
"omega-coin-flip": "omega-coin-flip 4s ease-in-out forwards"
```

**2. `src/components/MedicalChatWidget.tsx`** -- dostosowanie timera:

- `setTimeout(() => setIsSpinning(false), 4000)` zamiast 2000
- `setInterval(triggerSpin, 14000)` zamiast 12000 (4s obrot + 10s pauza)

### Efekt

- Obrot trwa 4 sekundy (wolniejszy, plynniejszy)
- Pauza nadal 10 sekund
- Cykl: 14 sekund (4s + 10s)

