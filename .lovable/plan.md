

## Przebudowa "Baza wiedzy" w Panelu Lidera

### Problem
Obecny widok pokazuje dwie grupy: "Dostępne dla wszystkich" i "Widoczne dla mojego zespolu". To jest bledne -- zasoby "dla wszystkich" sa juz w glownej Bibliotece (/knowledge). W Panelu Lidera maja byc **tylko** zasoby zespolowe (`visible_to_everyone = false`), ale z takim samym ukladem jak w glownej Bibliotece.

### Rozwiazanie
Przepisac `LeaderKnowledgeView.tsx` tak, aby:

1. **Pobierac tylko zasoby zespolowe** -- dodac filtr `.eq('visible_to_everyone', false)` do zapytania Supabase. Pobierac pelne dane (wszystkie pola potrzebne do kart dokumentow i grafik).

2. **Podzielic na dwie zakladki** identycznie jak glowna Biblioteka:
   - **Dokumenty edukacyjne** (`resource_type !== 'image'`) -- z wyszukiwarka, filtrem kategorii, filtrem typu, widokiem lista/siatka/grupowane
   - **Grafiki** (`resource_type === 'image'`) -- z wyszukiwarka, filtrem kategorii grafik, sortowaniem (najnowsze/najstarsze/alfabetycznie/najpopularniejsze), siatka kart z `GraphicsCard` i dialogiem udostepniania `SocialShareDialog`

3. **Zachowac funkcjonalnosci z glownej Biblioteki**:
   - Wyroznianie "Polecane" (is_featured) w zakladce dokumentow
   - Przyciski akcji (pobierz, kopiuj link, udostepnij, przekieruj) -- te same zasady co w glownej Bibliotece
   - Badge "Nowy" dla zasobow dodanych w ciagu ostatnich 7 dni
   - Kliknięcie grafiki otwiera `SocialShareDialog`

4. **Naglowek i opis**: Zmienic opis na "Zasoby wiedzy widoczne tylko dla Twojego zespolu."

### Szczegoly techniczne

**Plik do zmiany**: `src/components/leader/LeaderKnowledgeView.tsx` (pelne przepisanie)

**Zapytanie danych**:
```sql
SELECT * FROM knowledge_resources
WHERE status = 'active' AND visible_to_everyone = false
ORDER BY is_featured DESC, position ASC
```

**Importy do dodania**: `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`, `Button`, typy z `@/types/knowledge` (RESOURCE_TYPE_LABELS, DOCUMENT_CATEGORIES, GRAPHICS_CATEGORIES, ResourceType, KnowledgeResource), komponenty `GraphicsCard` i `SocialShareDialog` z `@/components/share`, dodatkowe ikony (Image, Download, Copy, Share2, Star, X, etc.)

**Struktura komponentu**:
- Stan: search (dokumenty), filterCategory, filterType, viewMode, graphicsSearchTerm, graphicsCategory, graphicsSortBy, selectedGraphic
- Podzial zasobow: `documentResources` (resource_type !== 'image') i `graphicsResources` (resource_type === 'image')
- Filtrowanie i sortowanie identyczne jak w `KnowledgeCenter.tsx`
- Renderowanie kart dokumentow z przyciskami akcji (allow_download, allow_copy_link, allow_share, allow_click_redirect)
- Renderowanie grafik przez `GraphicsCard` + `SocialShareDialog`

**Roznice wzgledem glownej Biblioteki**:
- Brak filtrowania po jezyku (uproszczenie dla lidera)
- Brak filtrowania po tagach (uproszczenie)
- Brak headera strony i komponentu Header (jest w kontekscie LeaderPanel)
- Uzycie `useQuery` zamiast manualnego `useState` + `useEffect` (zgodnie z obecnym wzorcem w LeaderKnowledgeView)

