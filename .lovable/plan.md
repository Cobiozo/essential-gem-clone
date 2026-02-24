

## Naprawa odswiezania pulpitu po powrocie z innej karty

### Zidentyfikowane przyczyny

**1. Stale closure `profile` w AuthContext (GLOWNA PRZYCZYNA)**

W pliku `AuthContext.tsx` linia 203, zmienna `profile` jest odczytywana z zamknietego scope useEffect, ktory uruchamia sie tylko raz. Wartosc `profile` w tym closure to zawsze `null` (wartosc poczatkowa), wiec warunek `profileAlreadyLoaded` jest zawsze `false`.

Skutek: kazdy event auth (np. po odswiezeniu tokenu przy powrocie na karte) powoduje zbedne wywolanie `fetchProfile()`, ktore tworzy nowy obiekt profile -> kaskada re-renderow calego Dashboard.

**2. `setProfile()` nie stabilizuje referencji**

W przeciwienstwie do `setUser` (linie 180-184, ktory porownuje ID i zachowuje stara referencje), `setProfile` zawsze ustawia nowy obiekt nawet jesli dane sie nie zmienily. To powoduje ze wszystkie hooki zalezne od `profile` sie odswieza.

**3. Service Worker `skipWaiting` + `clients.claim`**

W `sw-push.js` nowa wersja SW natychmiast przejmuje kontrole nad strona. Jesli aktualizacja SW nastapi podczas gdy uzytkownik jest na innej karcie, powrot moze wymusic przeladowanie zasobow.

---

### Plan naprawy

#### 1. AuthContext.tsx -- naprawic stale closure i stabilizowac profile

**a) Uzyc `useRef` dla profile w auth listener:**
Zamiast czytac `profile` z closure, uzyc `profileRef.current` ktory jest zawsze aktualny:

```
const profileRef = useRef<Profile | null>(null);

// synchronizowac ref z state:
useEffect(() => { profileRef.current = profile; }, [profile]);

// W auth listener:
const profileAlreadyLoaded = profileRef.current && 
  profileRef.current.user_id === newSession.user.id;
```

**b) Stabilizowac `setProfile` -- porownanie po `user_id` + `updated_at`:**

```
setProfile(prev => {
  if (prev && newData && 
      prev.user_id === newData.user_id && 
      prev.updated_at === newData.updated_at) {
    return prev; // zachowaj stara referencje
  }
  return newData;
});
```

#### 2. sw-push.js -- kontrolowane aktualizacje SW

Zamiast natychmiastowego `skipWaiting()` w instalacji, pozwolic uzytkownikowi zdecydowac (baner aktualizacji juz istnieje w `main.tsx`):

```
// USUNAC z install event:
// self.skipWaiting();

// ZOSTAWIC tylko w message handler (linia 270-272):
if (event.data === 'SKIP_WAITING') {
  self.skipWaiting();
}
```

To zapobiegnie sytuacji gdzie SW przejmuje strone podczas gdy uzytkownik jest na innej karcie.

---

### Pliki do zmian

| Plik | Zmiana |
|------|--------|
| `src/contexts/AuthContext.tsx` | Dodanie `profileRef` do eliminacji stale closure. Stabilizacja `setProfile` przez porownanie `user_id` + `updated_at`. |
| `public/sw-push.js` | Usuniecie `self.skipWaiting()` z handlera install (zostawienie tylko w message handler). |

### Szczegoly techniczne

**AuthContext.tsx:**
- Linia ~86: dodanie `const profileRef = useRef<Profile | null>(null);`
- Nowy useEffect: `useEffect(() => { profileRef.current = profile; }, [profile]);`
- Linia ~140: zmiana `setProfile(profileResult.data)` na stabilizowana wersje z porownaniem
- Linia ~203: zmiana `profile` na `profileRef.current`

**sw-push.js:**
- Linia 44: usuniecie `self.skipWaiting();` z handlera `install`

### Efekt koncowy

- Powrot na karte NIE powoduje ponownego pobierania profilu (jesli uzytkownik sie nie zmienil)
- Referencja `profile` pozostaje stabilna -> brak kaskady re-renderow
- Service Worker nie przejmuje strony automatycznie -> brak wymuszonych przeladowan
- Widgety Dashboard nie migaja ani nie laduja sie ponownie
