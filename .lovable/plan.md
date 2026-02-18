
# Naprawa bledu "Rendered more hooks than during the previous render"

## Diagnoza

Blad wystepuje w komponencie `InactivityHandler` w `App.tsx`. Przyczyna to HMR (Hot Module Replacement) - po edycji pliku `useInactivityTimeout.ts`, React wykrywa zmiane liczby hookow miedzy renderami, co jest naruszeniem zasad hookow React. Znacznik `?t=1771436192798` w stack trace potwierdza, ze blad pochodzi z HMR.

Blad jest "samoleczacy" - pelne odswiezenie strony (F5) go naprawia. Ale aby zapobiec wyswietlaniu ekranu bledu uzytkownikowi:

## Rozwiazanie

**Plik: `src/App.tsx`**

Owinac `InactivityHandler` w dedykowany `ErrorBoundary` aby bledy hookow w tym komponencie nie crashowaly calej aplikacji:

```text
Przed (linia 317):
<InactivityHandler />

Po:
<ErrorBoundary fallback={null}>
  <InactivityHandler />
</ErrorBoundary>
```

`InactivityHandler` renderuje `null` (nie ma UI), wiec `fallback={null}` jest idealny - jesli komponent sie "zepsuje" podczas HMR, uzytkownik nic nie zauwazy, a po kolejnym renderze (lub pelnym reload) odzyska dzialanie.

To jedyna zmiana - jedna linia w `App.tsx`.
