

## Ukrycie widgetu na stronie Omega Base + animacja obracania monety

### Zmiana 1: Ukrycie widgetu na stronie `/omega-base`

Widget z lupa jest zbedny na pelnostronicowym widoku PLC Omega Base. Komponent `MedicalChatWidget` dostanie dostep do aktualnej sciezki przez `useLocation()` z react-router-dom i nie bedzie renderowany jesli uzytkownik jest na `/omega-base`.

**Plik: `src/components/MedicalChatWidget.tsx`**
- Import `useLocation` z `react-router-dom`
- Dodanie warunku: jesli `location.pathname === '/omega-base'` -- zwroc `null` (nie renderuj nic)

### Zmiana 2: Zamiana animacji pulsowania na obracanie monety

Usuniecie animacji `omega-pulse-bounce` z przycisku i zastapienie nowa animacja `omega-coin-flip` -- obrot wokol osi Y (jak moneta) co 5 sekund.

**Plik: `tailwind.config.ts`**
- Nowe keyframes `omega-coin-flip`:
  - `0%` do `90%`: brak ruchu (`rotateY(0deg)`)
  - `93%`: `rotateY(180deg)` -- pol obrotu
  - `96%`: `rotateY(360deg)` -- pelny obrot
  - `100%`: `rotateY(360deg)` -- zatrzymanie
  - Calkowity czas: 5 sekund, wiec obrot trwa ~0.3s z 5s przerwa miedzy obrotami
- Nowa animacja: `omega-coin-flip: "omega-coin-flip 5s ease-in-out infinite"`
- Usuniecie starej animacji `omega-pulse-bounce` (keyframes i animation)

**Plik: `src/components/MedicalChatWidget.tsx`**
- Zamiana klasy `animate-omega-pulse-bounce` na `animate-omega-coin-flip`
- Dodanie `style={{ perspective: '600px' }}` na kontenerze lub `transform-style: preserve-3d` dla lepszego efektu 3D

### Szczegoly techniczne

| Plik | Zmiana |
|------|--------|
| `src/components/MedicalChatWidget.tsx` | Import `useLocation`, wczesny return `null` na `/omega-base`, zamiana klasy animacji |
| `tailwind.config.ts` | Nowe keyframes `omega-coin-flip` (obrot Y 360deg), nowa animacja 5s, usuniecie starej `omega-pulse-bounce` |

