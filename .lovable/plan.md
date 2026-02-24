

## Zmiana proporcji animacji omega-coin-flip

### Parametry
- Calkowity cykl: **200s** (bez zmian -- uzytkownik juz to zatwierdził)
- Obrot: **20s**
- Bezruch: **100s**
- Laczny cykl: **120s** (20s + 100s)

Uwaga: uzytkownik chce 20s obrotu + 100s bezruchu = **120s** calkowity cykl, nie 200s. Dostosuje cykl do 120s.

Proporcje: 20s / 120s = **16.6667%**

### Zmiana w `tailwind.config.ts`

1. **Keyframes** -- zmiana progu z `33.3333%` na `16.6667%`:
```text
"omega-coin-flip": {
  "0%": { transform: "rotateY(0deg)" },
  "16.6667%": { transform: "rotateY(360deg)" },
  "100%": { transform: "rotateY(360deg)" },
}
```

2. **Czas animacji** -- zmiana z `30s` na `120s`:
```text
"omega-coin-flip": "omega-coin-flip 120s ease-in-out infinite"
```

### Efekt
- 0-20s: wolny, plynny obrot 360 stopni
- 20-120s: calkowity bezruch (100 sekund)
- Petla nieskonczona

