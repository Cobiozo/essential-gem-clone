
## Podział Bazy wiedzy w Panelu Lidera na dwie podgrupy

### Cel
W zakładce "Baza wiedzy" w Panelu Lidera zasoby będą podzielone na dwie sekcje:
1. **Dostępne dla wszystkich** -- zasoby z flagą `visible_to_everyone = true` (dodawane przez admina dla wszystkich)
2. **Widoczne dla mojego zespołu** -- pozostałe zasoby (widoczne dla partnerów/specjalistów, ale nie oznaczone jako "dla wszystkich")

### Obecny stan
- `LeaderKnowledgeView.tsx` pobiera zasoby bez filtrowania po `status` i bez pola `visible_to_everyone`
- Wszystkie zasoby wyświetlane są na jednej płaskiej liście
- W bazie istnieje kolumna `visible_to_everyone` (boolean) -- obecnie wszystkie zasoby mają `false`, ale admin może to zmienić

### Zmiany

#### 1. Rozszerzenie zapytania w `LeaderKnowledgeView.tsx`
- Dodać pole `visible_to_everyone` do SELECT
- Dodać filtr `.eq('status', 'active')` (obecnie brakuje)

#### 2. Podział zasobów na dwie grupy
Po pobraniu i przefiltrowaniu (szukajka + kategoria), zasoby będą dzielone:
- `globalResources` = te z `visible_to_everyone === true`
- `teamResources` = pozostałe

#### 3. Renderowanie dwóch sekcji
Każda sekcja z nagłówkiem (np. ikona Globe + "Dostępne dla wszystkich" i ikona Users + "Widoczne dla mojego zespołu"). Jeśli dana sekcja jest pusta, wyświetli się komunikat "Brak zasobów w tej kategorii". Wyszukiwarka i filtr kategorii działają globalnie na obie sekcje.

### Pliki do zmiany
- `src/components/leader/LeaderKnowledgeView.tsx` -- jedyny plik
