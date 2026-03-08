
# Plan: Wymiana starego logo na nowe we wszystkich plikach

## Problem
Wiele stron nadal używa starego logo `pure-life-logo-new.png` zamiast nowego `pure-life-droplet-new.png`. Dotyczy to 11 plików.

## Zmiany

Zamiana importu logo w następujących plikach:

### Pliki używające `pure-life-logo-new.png` → `pure-life-droplet-new.png`:
1. `src/pages/MyAccount.tsx`
2. `src/pages/Index.tsx`
3. `src/pages/Admin.tsx`
4. `src/pages/KnowledgeCenter.tsx`
5. `src/pages/Page.tsx`
6. `src/pages/EventGuestRegistration.tsx`
7. `src/pages/InfoLinkPage.tsx`
8. `src/pages/SpecialistCalculator.tsx`
9. `src/components/calculator/CommissionCalculator.tsx`

### Pliki używające `pure-life-droplet.png` → `pure-life-droplet-new.png`:
10. `src/components/homepage/TeamSection.tsx`
11. `src/components/admin/DashboardFooterManagement.tsx`

Każda zmiana to podmiana jednej linii importu — żadna inna logika się nie zmienia.
