
Cel: doprecyzować animację widżeta PLC Omega Base do dokładnego cyklu „2s ruch + 10s bezruch” w pętli, bez żadnych drgań podczas postoju.

Zakres zmian:
1) `tailwind.config.ts` — jedyne miejsce wymagające edycji
- Zaktualizuję keyframes `omega-coin-flip`, aby:
  - start: `0%` → `rotateY(0deg)`
  - koniec obrotu po 2 sekundach: `16.6667%` → `rotateY(360deg)`  
    (bo 2s / 12s = 16.6667%)
  - pełny postój do końca cyklu: `100%` → `rotateY(360deg)`
- Zmieniam definicję animacji:
  - z `9.5s ease-in-out infinite`
  - na `12s ease-in-out infinite` (2s obrót + 10s pauza)

Dlaczego to spełni wymagania:
- Pełny obrót 360° trwa dokładnie 2 sekundy.
- Potem przez 10 sekund transformacja pozostaje identyczna (`rotateY(360deg)`), więc nie ma ruchu ani „mikropulsu”.
- Pętla jest naprzemienna i nieskończona: ruch → bezruch → ruch → bezruch.

Co pozostaje bez zmian:
- `src/components/MedicalChatWidget.tsx` już ma poprawne użycie klasy `animate-omega-coin-flip` oraz 3D (`perspective`, `transformStyle`), więc nie wymaga dodatkowych modyfikacji dla tego żądania.

Walidacja po wdrożeniu:
1) Otworzyć dashboard z widżetem.
2) Zmierzyć wizualnie cykl:
   - ~2s płynnego obrotu (ease-in-out),
   - ~10s całkowitego postoju (zero drgań).
3) Potwierdzić, że cykl powtarza się stale w tej samej sekwencji.
