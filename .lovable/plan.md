## Problem
W edytorze sekcji wydarzenia (zakładka „Sekcje") treść jest wprowadzana w polu `<Textarea>` jako zwykły tekst — z Enterami, akapitami i wcięciami. Na publicznej stronie wydarzenia treść renderowana jest przez `dangerouslySetInnerHTML` w kontenerze `prose`, który traktuje wejście jako HTML. W HTML zwykłe znaki nowej linii są zwijane do pojedynczej spacji — przez to akapity „sklejają się" w jeden blok tekstu i wygląd różni się od podglądu w polu edycji.

## Rozwiązanie
W komponencie renderującym treść sekcji dodać klasę `whitespace-pre-wrap`, aby przeglądarka zachowała znaki nowej linii i wcięcia wpisane w edytorze. Dzięki temu:
- Entery (nowe linie) z textarea pojawiają się jako rzeczywiste przejścia do nowej linii.
- Wcięcia/spacje są zachowane.
- Tagi HTML (np. `<b>`, `<a>`) nadal działają normalnie (`pre-wrap` nie wyłącza HTML).
- Wygląd na stronie wydarzenia odpowiada temu, co administrator widzi w polu edycji.

## Zakres zmian

**Plik:** `src/components/paid-events/public/PaidEventSection.tsx`

W kontenerze treści (`<div className="prose prose-lg max-w-none dark:prose-invert" ...>`) dodać klasę `whitespace-pre-wrap`.

Brak innych zmian (edytor, baza danych, typy bez modyfikacji).
