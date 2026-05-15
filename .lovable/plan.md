## Plan

### 1. Naprawa tytułu „Tytuł" na stronie Baza wiedzy
Pasek górny pokazuje „Tytuł", ponieważ `tf('hk.title', 'Baza wiedzy')` zwraca z bazy tłumaczeń wartość „Tytuł" (klucz `hk.title` jest błędnie ustawiony w `system_texts`/translations). Fallback nie działa bo wartość istnieje w bazie.

Zmiana: w plikach używających `tf('hk.title', ...)` zamienić klucz na świeży `tf('hk.pageTitle', 'Baza wiedzy')`, aby zadziałał polski fallback „Baza wiedzy" (a tłumaczenia DB można później dodać dla EN/DE itd.).

Pliki do edycji:
- `src/pages/HealthyKnowledge.tsx` — linie 238 i 246
- `src/pages/HealthyKnowledgePlayer.tsx` — wszystkie 4 wystąpienia `tf('hk.title', 'Baza wiedzy')`

### 2. Dodanie kategorii „Biznesowe"
W `src/types/healthyKnowledge.ts` w stałej `HEALTHY_KNOWLEDGE_CATEGORIES` dodać pozycję `'Biznesowe'` (przed `'Inne'`). Kategoria pojawi się w dropdownie „Kategoria" przy dodawaniu nowego materiału przez admina.

### Bez zmian backendowych / DB
Tylko UI. Wartości w bazie `healthy_knowledge.category` pozostają nietknięte.