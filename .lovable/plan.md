

## Przebudowa zakładki "Baza wiedzy Zespół-S.S." w Bibliotece

### Cel
Zakładka zespołowa ma być wizualnie oddzielona od głównych zakładek (przesunięta na prawą stronę) i wewnętrznie podzielona na "Dokumenty" i "Grafiki" -- identycznie jak w Panelu Lidera.

### Zmiany w pliku `src/pages/KnowledgeCenter.tsx`

#### 1. Rozdzielenie TabsList -- zakładka zespołowa po prawej

Zamiast jednego `TabsList` z trzema zakładkami obok siebie, layout zostanie zmieniony na:

```text
[Dokumenty edukacyjne] [Grafiki 179]     <--- przerwa --->     [Baza wiedzy Zespół-S.S. 1]
```

Technicznie: owinięcie TabsList w `flex justify-between`, gdzie lewa strona to dwie główne zakładki, a prawa to zakładka zespołowa.

#### 2. Podział wewnętrzny zakładki zespołowej na Dokumenty / Grafiki

Aktualnie zakładka "team" wyświetla wszystkie zasoby płasko (lista). Zostanie dodany wewnętrzny stan `teamSubTab` (`'documents' | 'graphics'`) z:

- **Dokumenty zespołu**: lista zasobów z `resource_type !== 'image'`, z wyszukiwarką i filtrami kategorii
- **Grafiki zespołu**: siatka zasobów z `resource_type === 'image'`, z wyszukiwarką i filtrami kategorii, wyświetlane jako `GraphicsCard` z dialogiem udostępniania

Układ wewnętrzny będzie analogiczny do tego, co lider widzi w `LeaderKnowledgeView`:
- Pod-zakładki "Dokumenty" / "Grafiki" z licznikami
- Osobne wyszukiwarki i filtry kategorii dla każdej pod-zakładki
- Grafiki w siatce z `GraphicsCard`, dokumenty jako karty listowe

#### 3. Nowe zmienne stanu

- `teamSubTab: 'documents' | 'graphics'` -- pod-zakładka wewnątrz sekcji zespołowej
- `teamGraphicsCategory: string` -- filtr kategorii grafik zespołowych
- `teamGraphicsSearchTerm: string` -- wyszukiwarka grafik zespołowych
- Istniejący `teamSearchTerm` zostanie użyty dla dokumentów zespołowych

#### 4. Filtrowanie zasobów zespołowych

Zasoby zespołowe zostaną podzielone na:
- `teamDocuments = teamResources.filter(r => r.resource_type !== 'image')`
- `teamGraphics = teamResources.filter(r => r.resource_type === 'image')`

Każda grupa będzie filtrowana osobno przez swoje wyszukiwarki i filtry kategorii.

### Podsumowanie zmian
- Jeden plik: `src/pages/KnowledgeCenter.tsx`
- Brak zmian w bazie danych ani w innych komponentach
- Zachowana pełna kompatybilność z istniejącą logiką RPC i RLS

