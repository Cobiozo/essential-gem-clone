

## Animacja omega-coin-flip: 3 obroty w 60 sekund

Przycisk widgetu PLC Omega Base ma sie obracac **3 razy wokol osi Y** w ciagu **1 minuty zegarowej** -- wolno, plynnie, bez przerw.

### Parametry
- **3 pelne obroty** (3 x 360 = 1080 stopni)
- **60 sekund** na cykl
- Ciagle, bez zatrzymywania sie
- Tempo liniowe (rownomierne)

### Zmiana w `tailwind.config.ts`

**Keyframes:**
```text
"omega-coin-flip": {
  "0%": { transform: "rotateY(0deg)" },
  "100%": { transform: "rotateY(1080deg)" },
}
```

**Animacja:**
```text
"omega-coin-flip": "omega-coin-flip 60s linear infinite"
```

### Efekt koncowy
- Co 20 sekund -- jeden pelny obrot 360 stopni
- Ruch plynny, wolny, nieprzerwany
- Petla nieskonczona

