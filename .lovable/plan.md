

# Usunięcie strzałki + tooltip nie może zasłaniać podświetlonego elementu

## Zmiany

### 1. Usunięcie TourArrow

- **Usunięcie pliku** `src/components/onboarding/TourArrow.tsx`
- **TourOverlay.tsx**: Usunięcie importu `TourArrow`, stanu `tooltipRect`, callbacku `handleTooltipRect`, renderowania strzałki i prop `onTooltipRect` z `TourTooltip`
- **TourTooltip.tsx**: Usunięcie prop `onTooltipRect`, `cardRef` reporting logic, `reportRect` callback i związanego `useEffect`

### 2. Inteligentne pozycjonowanie tooltipa (nie zasłania elementu)

Obecna logika umieszcza tooltip wg `step.position` ale po clampingu do viewportu może on nakładać się na podświetlony element. Nowa logika:

1. Oblicz pozycję wg preferowanego `step.position`
2. **Sprawdź kolizję** - czy prostokąt tooltipa nachodzi na prostokąt podświetlonego elementu
3. Jeśli tak - **automatycznie wypróbuj kolejne pozycje** w kolejności: bottom → right → left → top
4. Wybierz pierwszą pozycję bez kolizji, a jeśli żadna nie działa - użyj pozycji z największym dystansem od elementu

Logika kolizji: dwa prostokąty nachodzą na siebie gdy `!(A.right < B.left || A.left > B.right || A.bottom < B.top || A.top > B.bottom)`

## Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `src/components/onboarding/TourArrow.tsx` | Usunięcie pliku |
| `src/components/onboarding/TourOverlay.tsx` | Usunięcie strzałki i powiązanego stanu |
| `src/components/onboarding/TourTooltip.tsx` | Usunięcie `onTooltipRect`, dodanie auto-repositioning przy kolizji |

