

## Usunięcie widżetu Zdrowa Wiedza z dashboardu

Widżet `HealthyKnowledgeWidget` zostanie usunięty z `Dashboard.tsx` — zarówno import jak i render. Sam plik komponentu pozostaje (używany może być gdzie indziej). Żadna inna funkcjonalność nie zostanie naruszona.

### Zmiana

**`src/pages/Dashboard.tsx`**:
- Usunąć lazy import `HealthyKnowledgeWidget`
- Usunąć blok `<Suspense>` z `<HealthyKnowledgeWidget />`

