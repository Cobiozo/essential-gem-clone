

# Domyslny jezyk z pulpitu w Akademii i Zdrowej Wiedzy

## Problem

Obecnie oba moduły startują z wartością `'all'` (wszystkie języki). Powinny startować z językiem wybranym przez użytkownika na pulpicie (z `useLanguage()`).

## Zmiany

### 1. `src/pages/Training.tsx` (linia 52)

```
// Przed:
const [trainingLanguage, setTrainingLanguage] = useState<string>('all');

// Po:
const { language } = useLanguage();
const [trainingLanguage, setTrainingLanguage] = useState<string>(language);
```

Hook `useLanguage` jest prawdopodobnie już zaimportowany w pliku (używany do tłumaczeń). Jeśli nie - dodanie importu.

### 2. `src/pages/HealthyKnowledge.tsx` (linia 43)

```
// Przed:
const [contentLanguage, setContentLanguage] = useState<string>('all');

// Po:
const { language } = useLanguage();
const [contentLanguage, setContentLanguage] = useState<string>(language);
```

Analogicznie - użycie języka z kontekstu jako wartości domyślnej.

## Efekt

Po wejściu do Akademii lub Zdrowej Wiedzy, domyślnie wyświetlane będą materiały w języku który użytkownik wybrał na pulpicie (np. DE, EN, PL). Użytkownik nadal może zmienić język ręcznie lub wybrać "Wszystkie".
