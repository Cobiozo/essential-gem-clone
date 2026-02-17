

# Modul tlumaczen tresci dynamicznych (Szkolenia, Zasoby, Zdrowa Wiedza)

## Problem

Aktualnie system tlumaczen obsluguje:
- **i18n_translations** — statyczne klucze UI (przyciski, etykiety)
- **cms_item_translations / cms_section_translations** — tresci CMS (sekcje stron)

Brakuje tlumaczen dla tresci dynamicznych dodawanych przez admina:
- **Szkolenia** — tytuły modulow ("Biznesowe", "Podstawy zdrowia") i lekcji
- **Baza wiedzy** — tytuły zasobow ("Relacja omega-342"), opisy
- **Zdrowa Wiedza** — tytuły, opisy materialow

## Rozwiazanie

### 1. Nowe tabele w bazie danych

Trzy nowe tabele tlumaczen, wzorowane na istniejacym `cms_item_translations`:

**`training_module_translations`**

| Kolumna | Typ | Opis |
|---------|-----|------|
| id | UUID PK | |
| module_id | UUID FK -> training_modules | |
| language_code | TEXT FK -> i18n_languages | |
| title | TEXT | Przetlumaczony tytul modulu |
| description | TEXT | Przetlumaczony opis |
| created_at / updated_at | TIMESTAMPTZ | |
| UNIQUE | (module_id, language_code) | |

**`training_lesson_translations`**

| Kolumna | Typ | Opis |
|---------|-----|------|
| id | UUID PK | |
| lesson_id | UUID FK -> training_lessons | |
| language_code | TEXT FK -> i18n_languages | |
| title | TEXT | Przetlumaczony tytul lekcji |
| content | TEXT | Przetlumaczona tresc lekcji |
| media_alt_text | TEXT | Przetlumaczony alt text |
| created_at / updated_at | TIMESTAMPTZ | |
| UNIQUE | (lesson_id, language_code) | |

**`knowledge_resource_translations`**

| Kolumna | Typ | Opis |
|---------|-----|------|
| id | UUID PK | |
| resource_id | UUID FK -> knowledge_resources | |
| language_code | TEXT FK -> i18n_languages | |
| title | TEXT | Przetlumaczony tytul |
| description | TEXT | Przetlumaczony opis |
| context_of_use | TEXT | Przetlumaczony kontekst |
| created_at / updated_at | TIMESTAMPTZ | |
| UNIQUE | (resource_id, language_code) | |

**`healthy_knowledge_translations`**

| Kolumna | Typ | Opis |
|---------|-----|------|
| id | UUID PK | |
| item_id | UUID FK -> healthy_knowledge | |
| language_code | TEXT FK -> i18n_languages | |
| title | TEXT | |
| description | TEXT | |
| text_content | TEXT | Przetlumaczona tresc tekstowa |
| created_at / updated_at | TIMESTAMPTZ | |
| UNIQUE | (item_id, language_code) | |

Kazda tabela: RLS wlaczone, admini pelny dostep, wszyscy SELECT.

### 2. Hooki do pobierania tlumaczen (frontend)

Nowe hooki wzorowane na istniejacym `useCMSTranslations`:

- **`useTrainingTranslations(modules, lessons, languageCode)`** — zwraca przetlumaczone moduly i lekcje
- **`useKnowledgeTranslations(resources, languageCode)`** — zwraca przetlumaczone zasoby
- **`useHealthyKnowledgeTranslations(items, languageCode)`** — zwraca przetlumaczone materialy

Kazdy hook: pobiera tlumaczenia z bazy, merguje z oryginalem, zwraca oryginaly jesli brak tlumaczenia.

### 3. Nowa zakladka w panelu tlumaczen

W `TranslationsManagement.tsx` — nowa zakladka **"Tresci dynamiczne"** obok istniejacych "Jezyki", "Tlumaczenia", "Tresci CMS", "JSON":

- Podsekcje: Szkolenia | Baza wiedzy | Zdrowa Wiedza
- Kazda podsekcja: lista elementow z polami do edycji tlumaczen per jezyk
- Przycisk "Tlumacz AI" do automatycznego tlumaczenia (analogicznie do CMS)
- Pasek postepu tlumaczenia z wykorzystaniem istniejacego `useTranslationJobs`

### 4. Rozszerzenie edge function `background-translate`

Dodanie obslugi nowych `job_type` wartosci:
- `training` — tlumaczenie modulow i lekcji szkoleniowych
- `knowledge` — tlumaczenie zasobow bazy wiedzy
- `healthy_knowledge` — tlumaczenie Zdrowej Wiedzy

Wykorzystanie istniejacego wzorca: pobranie elementow z bazy, wyslanie do AI w batchach, zapis wynikow do odpowiedniej tabeli tlumaczen.

### 5. Integracja z widokami uzytkownika

Podlaczenie hookow tlumaczen w komponentach wyswietlajacych te tresci:
- Strona szkolen — `useTrainingTranslations` przed renderowaniem modulow/lekcji
- Baza wiedzy — `useKnowledgeTranslations` przed renderowaniem zasobow
- Zdrowa Wiedza — `useHealthyKnowledgeTranslations` przed renderowaniem materialow

## Pliki do utworzenia / zmiany

| Plik | Akcja |
|------|-------|
| Migracja SQL | Utworzenie 4 nowych tabel z RLS |
| `src/hooks/useTrainingTranslations.ts` | Nowy hook |
| `src/hooks/useKnowledgeTranslations.ts` | Nowy hook |
| `src/hooks/useHealthyKnowledgeTranslations.ts` | Nowy hook |
| `src/components/admin/DynamicContentTranslation.tsx` | Nowy komponent — zakladka tlumaczen dynamicznych |
| `src/components/admin/TranslationsManagement.tsx` | Dodanie nowej zakladki |
| `supabase/functions/background-translate/index.ts` | Obsluga nowych job_type |
| Komponenty szkolen / wiedzy | Integracja hookow tlumaczen |

## Kolejnosc implementacji

1. Migracja bazy danych (4 tabele)
2. Hooki tlumaczen (3 pliki)
3. Komponent admin DynamicContentTranslation
4. Zakladka w TranslationsManagement
5. Rozszerzenie background-translate
6. Integracja z widokami uzytkownika

