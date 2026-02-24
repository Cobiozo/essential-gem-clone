

## Zmiana cyklu animacji omega-coin-flip

### Parametry
- Obrot: **200s**
- Bezruch: **1000s**
- Calkowity cykl: **1200s** (20 minut)

Proporcje: 200s / 1200s = **16.6667%**

### Zmiana w `tailwind.config.ts`

1. **Keyframes** -- bez zmian (prog 16.6667% juz ustawiony poprawnie)

2. **Czas animacji** -- zmiana z `120s` na `1200s`:
```text
"omega-coin-flip": "omega-coin-flip 1200s ease-in-out infinite"
```

### Efekt
- 0-200s: bardzo wolny, plynny obrot 360 stopni (3 minuty 20 sekund)
- 200-1200s: calkowity bezruch (16 minut 40 sekund)
- Petla nieskonczona

