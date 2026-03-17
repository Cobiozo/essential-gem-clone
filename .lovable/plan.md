

# Plan: Przycisk powrotu do pulpitu na stronie Skills Assessment

## Zmiana

Dodać przycisk „Powrót do pulpitu" w lewym górnym rogu strony `/skills-assessment` — zarówno w widoku quizu, jak i w widoku podsumowania.

## Plik do zmiany

**`src/pages/SkillsAssessment.tsx`**

- Zaimportować `useNavigate` z `react-router-dom` oraz ikonę `Home` z `lucide-react`.
- W obu widokach (quiz i summary) dodać na samej górze, przed tytułem, przycisk z ikoną strzałki i tekstem „Pulpit", który nawiguje do `/dashboard`.
- Przycisk w stylu `variant="ghost"`, z małą ikoną `ArrowLeft` lub `Home`, umieszczony w lewym górnym rogu kontenera.

