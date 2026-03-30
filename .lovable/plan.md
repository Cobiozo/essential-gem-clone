

## Testymoniale jako osobna grupa w panelu admina

### Obecny stan
- Zakładka "Materiały" zawiera wszystkie materiały, w tym testymoniale
- Zakładka "Opinie" jest osobna i pokazuje tylko pending komentarze
- Użytkownik chce, by testymoniale tworzyły osobną grupę razem z opiniami

### Zmiany w `src/components/admin/HealthyKnowledgeManagement.tsx`

**1. Nowa zakładka "Testymoniale"** — zastępuje osobną zakładkę "Opinie"
- Dodać TabsTrigger `"testimonials"` z liczbą testymoniali
- Wewnątrz: dwie sekcje:
  - **Lista materiałów-testymoniali** (filtrowanych z `materials` po `category === 'Testymoniale'`) — ta sama tabela co w "Materiały", ale tylko testymoniale
  - **Moderacja opinii** (przeniesiona z obecnej zakładki "moderation") — pending komentarze z przyciskami Zatwierdź/Odrzuć

**2. Zakładka "Materiały"** — filtrować, by NIE pokazywać testymoniali
- `filteredMaterials` w TabsContent "materials" → dodać `.filter(m => m.category !== 'Testymoniale')`

**3. Usunąć osobną zakładkę "Opinie"** — przenieść jej zawartość do nowej zakładki "Testymoniale"

**4. Tab onValueChange** — przy przełączeniu na "testimonials" wywołać `fetchPendingComments()`

### Struktura nowej zakładki "Testymoniale"

```text
┌─────────────────────────────────────────────┐
│ Testymoniale (N)                            │
├─────────────────────────────────────────────┤
│ [Tabela materiałów z kategorią Testymoniale]│
│  - ta sama tabela co w Materiały            │
├─────────────────────────────────────────────┤
│ Moderacja opinii                            │
│  - lista pending komentarzy                 │
│  - przyciski Zatwierdź / Odrzuć             │
└─────────────────────────────────────────────┘
```

### Pliki do modyfikacji
- `src/components/admin/HealthyKnowledgeManagement.tsx` — jedyny plik

