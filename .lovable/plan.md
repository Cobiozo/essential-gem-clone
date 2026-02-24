

## Poprawka animacji widgetu PLC Omega Base -- obrot monety 3D

### Problem

Obecna animacja `omega-coin-flip` trwa 5s z kompresja obrotu w 10% czasu -- efekt jest nienaturalny. Uzytkownik chce dokladnie: 1.5s obrotu + 8s postoju, plynnie, bez drgan.

### Rozwiazanie

Calkowity cykl animacji: **9.5 sekund** (1.5s obrotu + 8s postoju).

Proporcje w keyframes:
- Obrot zajmuje 1.5 / 9.5 = ~15.8% czasu
- Postoj zajmuje 8 / 9.5 = ~84.2% czasu

Keyframes:
- `0%`: `rotateY(0deg)` -- start obrotu
- `15.8%`: `rotateY(360deg)` -- koniec obrotu (po 1.5s)
- `100%`: `rotateY(360deg)` -- postoj az do konca (8s bez ruchu)

### Zmiany techniczne

**Plik: `tailwind.config.ts`**

Keyframes `omega-coin-flip` (linie 223-227):
```
"omega-coin-flip": {
  "0%": { transform: "rotateY(0deg)" },
  "15.8%": { transform: "rotateY(360deg)" },
  "100%": { transform: "rotateY(360deg)" },
},
```

Animacja (linia 261):
```
"omega-coin-flip": "omega-coin-flip 9.5s ease-in-out infinite",
```

**Plik: `src/components/MedicalChatWidget.tsx`** -- bez zmian, klasa `animate-omega-coin-flip` i style `perspective`/`transformStyle` pozostaja.

| Plik | Zmiana |
|------|--------|
| `tailwind.config.ts` | Nowe keyframes (0% -> 15.8% -> 100%) i czas 9.5s |

