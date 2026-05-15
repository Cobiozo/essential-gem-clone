## Cel
Zmiana wyświetlanych nazw czterech sekcji w panelach dashboard i CMS, aby były spójne z nową terminologią produktową.

## Zmiany w kodzie

### 1. Pasek boczny pulpitu głównego
**Plik:** `src/components/dashboard/DashboardSidebar.tsx`  
W fallback mapie menuLabelFallbacks zmienić:
- `'dashboard.menu.healthyKnowledge': 'Zdrowa Wiedza'` → `'Baza wiedzy'`

### 2. Pasek boczny panelu CMS (AdminSidebar)
**Plik:** `src/components/admin/AdminSidebar.tsx`  
W hardcodedLabels zmienić:
- `healthyKnowledge: 'Zdrowa Wiedza'` → `'Baza wiedzy'`

### 3. Panel CMS — przycisk "Zasoby wiedzy"
**Plik:** `src/components/admin/ProductCatalogManager.tsx:204`  
Zmienić label przycisku z "Zasoby wiedzy" na "Biblioteka" (zgodnie z nazwą na pasku bocznym dashboardu).

### 4. Panel CMS administratora — sekcja Testymoniale
**Plik:** `src/components/admin/HealthyKnowledgeManagement.tsx`  
Zmienić wszystkie wyświetlane odniesienia do "Testymoniale" na "Prawdziwe historie" lub formy odmienione w kontekście:
- Zakładka: `Testymoniale ({testimonialMaterials.length})` → `Prawdziwe historie ({...})`
- Pusty stan: `Brak testymoniali. Dodaj materiał z kategorią "Testymoniale".` → `Brak historii...`
- Badge kategorii na liście
- Nagłówki i komunikaty w formularzu edycji

## Uwaga techniczna: kategoria w bazie danych
Aktualna wartość kategorii w bazie to `"Testymoniale"` (używana w filtrach i zapisach). Zmiana tego stringa w kodzie bez migracji bazy spowoduje, że istniejące rekordy przestaną pasować do filtrów.  

**Rekomendowane podejście:** Wprowadzić warstwę mapowania display-label (np. `CATEGORY_DISPLAY_NAMES`), która pokazuje użytkownikowi "Prawdziwe historie", podczas gdy w bazie nadal zapisywana jest wartość `"Testymoniale"`. To zapewnia spójność UI bez ryzyka utraty danych.

**Alternatywa:** Jeśli użytkownik wymaga zmiany wartości w bazie, konieczna będzie migracja aktualizująca istniejące rekordy w tabeli `healthy_knowledge`.

## Zakres poza kodem
- Tabela `system_texts` w bazie — jeśli zawiera klucze tłumaczeń dla `healthyKnowledge`, wymagana jest ich aktualizacja w panelu administratora (System → Teksty) lub bezpośrednio w bazie.
- Publiczna strona `/zdrowa-wiedza` (HealthyKnowledgePublicPage) oraz Player używają tf/tf z fallbackami — zmiana nazw tam leży poza tym zadaniem, chyba że użytkownik rozwinie scope.

## Pliki do edycji (bez migracji)
1. `src/components/dashboard/DashboardSidebar.tsx`
2. `src/components/admin/AdminSidebar.tsx`
3. `src/components/admin/ProductCatalogManager.tsx`
4. `src/components/admin/HealthyKnowledgeManagement.tsx`