# Naprawa: partner nie może wejść w Aktualności

## Przyczyna

W `src/pages/NewsHubPage.tsx` wczesne `return` (loading / brak dostępu, linie 42–58) są umieszczone **przed** hookami `useMemo` (`availableYears` w linii 60 i `pinned/regular` w linii 69). To łamie Rules of Hooks — gdy `visLoading=true` lub `isModuleVisible=false`, React renderuje mniej hooków niż w poprzednim renderze, co powoduje **Minified React error #310**.

Partner trafia w to za każdym razem, bo dla niego najpierw leci render z `visLoading`, potem render z danymi → zmienna liczba hooków → crash → ErrorBoundary pokazuje "Coś poszło nie tak".

## Zmiana (1 plik)

`src/pages/NewsHubPage.tsx`:

1. Przenieść oba bloki `useMemo` (linie 60–89) **przed** wczesne returny (przed linię 42).
2. Pozostawić logikę returnu dla `visLoading` i `!isModuleVisible` bez zmian, tylko niżej w ciele komponentu — po wszystkich hookach.

Brak zmian w logice biznesowej, RLS ani w innych plikach.
