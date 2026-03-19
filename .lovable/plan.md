

# Plan: Ujednolicenie wyglądu panelu bocznego CMS z panelem głównym

## Problem
Panel boczny CMS (AdminSidebar) używa domyślnych, jasnych klas (`border-r`, `bg-background`), podczas gdy panel główny (DashboardSidebar) stosuje ciemną kolorystykę (`bg-sidebar`, `border-sidebar-border`, `text-sidebar-foreground`) z większymi czcionkami i spójnym stylem.

## Zmiany

### 1. `src/components/admin/AdminSidebar.tsx`
- Zmienić `className="border-r"` na `className="border-r border-sidebar-border bg-sidebar"`
- Header: dodać `border-sidebar-border`, tekst `text-sidebar-foreground`, logo większe (h-10)
- Kategorie (CollapsibleTrigger): dodać `hover:bg-primary/10` zamiast `hover:bg-muted/50`
- Aktywne elementy: zmienić z `bg-primary/10 text-primary` na `bg-primary/15 text-primary` (jak w dashboardzie)
- Footer: dodać `border-sidebar-border`, przycisk wylogowania: `text-destructive hover:bg-destructive/10`
- Input wyszukiwania: ciemny styl (`bg-sidebar-accent border-sidebar-border`)

### 2. `src/pages/Admin.tsx`
- Zmienić wrapper `bg-background` na gradient identyczny z DashboardLayout: `bg-gradient-to-br from-[hsl(225,50%,6%)] via-[hsl(225,40%,8%)] to-[hsl(230,35%,5%)]`

## Efekt
Oba paski boczne będą wizualnie identyczne — ciemne tło, złota/primary kolorystyka, te same fonty i rozmiary.

