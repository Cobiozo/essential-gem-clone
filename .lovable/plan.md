

## Animacja widgetu PLC Omega Base -- wolny obrot monety

### Parametry animacji
- Calkowity cykl: **30 sekund**
- Obrot 360 stopni: **10 sekund** (wolny, plynny)
- Bezruch (zero drgan): **20 sekund**
- Petla nieskonczona

### Zmiana w pliku `tailwind.config.ts`

Proporcje: 10s / 30s = 33.3333%

**Keyframes `omega-coin-flip`** (linie 223-227):
```text
"omega-coin-flip": {
  "0%": { transform: "rotateY(0deg)" },
  "33.3333%": { transform: "rotateY(360deg)" },
  "100%": { transform: "rotateY(360deg)" },
}
```

**Animacja** (linia 261):
```text
"omega-coin-flip": "omega-coin-flip 30s ease-in-out infinite"
```

### Dlaczego to zadziala
- Od 0% do 33.3333% (= 10 sekund) -- wolny, plynny obrot 360 stopni z ease-in-out
- Od 33.3333% do 100% (= 20 sekund) -- wartosc transform jest identyczna (`rotateY(360deg)`), wiec zero ruchu, zero drgan
- Petla powtarza sie w nieskonczonosc: obrot -> bezruch -> obrot -> bezruch

### Bez zmian
- `src/components/MedicalChatWidget.tsx` -- klasa `animate-omega-coin-flip` i style 3D (`perspective`, `transformStyle`) pozostaja bez zmian

