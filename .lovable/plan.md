
# Usunięcie przycisku Diagnostyka/Pomoc z VideoControls

## Zakres zmian

**Plik: `src/components/training/VideoControls.tsx`**

1. **Usunąć importy**: `HelpCircle`, `Settings`, `Copy` (nieużywane po zmianie)
2. **Usunąć props z interfejsu**: `showDiagnostics`, `videoSrc`, `retryCount`, `smartBufferingActive`, `bufferedAheadSeconds`, `connectionType`, `downlink`, `rtt`
3. **Usunąć destructuring** tych props z komponentu
4. **Usunąć funkcję `copyDiagnostics`** (linie ~65-79)
5. **Usunąć cały Button** z `HelpCircle` (linie 229-281) — przycisk "Diagnostyka"/"Pomoc" wraz z toast contentem

Przycisk "Napraw" (`onRetry`) pozostaje — nadal przydatny dla użytkowników.

Jeden plik, usunięcie ~80 linii martwego kodu.
