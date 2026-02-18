
# Naprawa problemu wyrzucania ze spotkania przy przełączaniu kart

## Zidentyfikowane przyczyny

### Przyczyna 1: Timeout nieaktywnosci (30 min) nie uwzglednia spotkan
Hook `useInactivityTimeout` wylogowuje uzytkownika po 30 minutach bez klikniecia/scrollowania. Podczas spotkania wideo uzytkownik czesto tylko ogląda - nie klika, nie scrolluje. Po 30 minutach system go wylogowuje. Dodatkowo, gdy uzytkownik przełącza karte i wraca po 31+ minutach, nastepuje natychmiastowe wylogowanie.

### Przyczyna 2: Sciezka `/meeting-room` nie jest w KNOWN_APP_ROUTES
W `ProfileCompletionGuard.tsx` lista `KNOWN_APP_ROUTES` nie zawiera `/meeting-room`. Choc nie powoduje to bezposredniego problemu z partnerem (bo sciezka ma dwa segmenty), to brak jej w liscie znanych tras moze powodowac nieprzewidziane zachowania.

---

## Plan naprawy

### 1. Emitowanie zdarzen aktywnosci podczas spotkania

**Plik: `src/components/meeting/VideoRoom.tsx`**

Dodanie cyklicznego emitowania zdarzenia `video-activity` co 60 sekund podczas aktywnego spotkania. Hook `useInactivityTimeout` juz nasluchuje na to zdarzenie (linia 138-141) i resetuje timer. Wystarczy wiec emitowac to zdarzenie z VideoRoom.

```text
useEffect(() => {
  // Emit activity event every 60s to prevent inactivity logout during meeting
  const interval = setInterval(() => {
    window.dispatchEvent(new Event('video-activity'));
  }, 60000);
  return () => clearInterval(interval);
}, []);
```

### 2. Dodanie `/meeting-room` do KNOWN_APP_ROUTES

**Plik: `src/components/profile/ProfileCompletionGuard.tsx`**

Dodanie `/meeting-room` do tablicy `KNOWN_APP_ROUTES` (linia 46-50), aby system poprawnie rozpoznawal te sciezke.

### 3. Zabezpieczenie MeetingRoom przed flickerem user

**Plik: `src/pages/MeetingRoom.tsx`**

Dodanie referencji `userRef` ktora zapamietuje ostatniego poprawnego uzytkownika. Jesli `user` chwilowo stanie sie `null` (flicker podczas odswiezania tokenu), komponent uzyje zapamiętanej wartosci zamiast natychmiast pokazywac ekran "Brak dostepu".

```text
// Zapamietaj ostatniego poprawnego usera
const userRef = useRef(user);
if (user) userRef.current = user;

// W weryfikacji - uzywaj userRef.current zamiast user
// Nie ustawiaj 'unauthorized' jesli user jest null ale userRef ma wartosc
```

---

## Podsumowanie zmian

| Plik | Zmiana |
|---|---|
| `VideoRoom.tsx` | Emitowanie `video-activity` co 60s |
| `ProfileCompletionGuard.tsx` | Dodanie `/meeting-room` do KNOWN_APP_ROUTES |
| `MeetingRoom.tsx` | Ref zabezpieczajacy przed flickerem usera |

Te trzy zmiany eliminuja wszystkie zidentyfikowane przyczyny wyrzucania ze spotkania przy przełączaniu kart.
