
# Dodanie wyboru jezyka materialow w Akademii i Zdrowej Wiedzy

## Kontekst

Biblioteka (knowledge_resources) juz posiada kolumne `language_code` z selektorem jezyka w panelu admina i filtrowaniem po stronie uzytkownika. Ten sam wzorzec nalezy zastosowac w:
- **Akademii** (training_modules + training_lessons)
- **Zdrowej Wiedzy** (healthy_knowledge)

## Zmiany w bazie danych (migracja SQL)

Dodanie kolumny `language_code` do 3 tabel:

```text
ALTER TABLE training_modules ADD COLUMN language_code TEXT DEFAULT 'pl';
ALTER TABLE training_lessons ADD COLUMN language_code TEXT DEFAULT 'pl';
ALTER TABLE healthy_knowledge ADD COLUMN language_code TEXT DEFAULT 'pl';
```

Domyslna wartosc `'pl'` - istniejace materialy zostana oznaczone jako polskie. `NULL` oznacza "uniwersalny" (widoczny we wszystkich jezykach), tak samo jak w bibliotece.

## Zmiany w panelu admina

### TrainingManagement.tsx

1. Dodanie importu `LANGUAGE_OPTIONS` i `getLanguageLabel` z `@/types/knowledge`
2. W interfejsie `TrainingModule` i `TrainingLesson` - dodanie pola `language_code?: string | null`
3. W formularzu modulu i lekcji - dodanie selektora "Jezyk materialu" (Select z LANGUAGE_OPTIONS), identycznego jak w KnowledgeResourcesManagement
4. Dodanie filtra jezyka na liscie modulow (stan `filterLanguage`)
5. Badge z flaga jezyka przy kazdym module/lekcji na liscie

### HealthyKnowledgeManagement.tsx

1. Dodanie importu `LANGUAGE_OPTIONS` i `getLanguageLabel`
2. W formularzu edycji materialu - dodanie selektora "Jezyk materialu"
3. Dodanie filtra jezyka na liscie materialow (stan `filterLanguage`)
4. Badge z flaga jezyka przy kazdym materiale na liscie

### Typ HealthyKnowledge (healthyKnowledge.ts)

Dodanie pola `language_code: string | null` do interfejsu `HealthyKnowledge`.

### Typ TrainingModule/TrainingLesson (training.ts i TrainingManagement.tsx)

Dodanie pola `language_code?: string | null` do interfejsow.

## Zmiany po stronie uzytkownika

### Akademia (TrainingModule.tsx i powiazane)

Moduly szkoleniowe sa przypisywane uzytkownikom (training_assignments), wiec filtrowanie po stronie uzytkownika powinno dzialac na zasadzie: pokazuj moduly w jezyku interfejsu uzytkownika ORAZ moduly uniwersalne (language_code = null). Dodanie filtra jezyka analogicznie do biblioteki.

### Zdrowa Wiedza (strona uzytkownika)

Dodanie selektora jezyka dokumentow (identycznego jak w bibliotece) - domyslnie ustawionego na jezyk interfejsu, z mozliwoscia zmiany. Filtrowanie: `language_code === selectedLanguage || language_code === null`.

## Podsumowanie zmian

| Plik | Zmiana |
|---|---|
| Migracja SQL | Kolumna `language_code` w 3 tabelach |
| `src/types/healthyKnowledge.ts` | Pole `language_code` w interfejsie |
| `src/types/training.ts` | Pole `language_code` w interfejsach |
| `src/components/admin/TrainingManagement.tsx` | Selektor jezyka w formularzach, filtr, badge |
| `src/components/admin/HealthyKnowledgeManagement.tsx` | Selektor jezyka w formularzu, filtr, badge |
| Strona uzytkownika (szkolenia) | Filtrowanie modulow po jezyku |
| Strona uzytkownika (zdrowa wiedza) | Selektor + filtrowanie po jezyku |
