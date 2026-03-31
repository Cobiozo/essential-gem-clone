

# Naprawa widżetu "Zaproś na Webinar" — widoczny mimo wyłączenia

## Problem
1. **Fallback `true` gdy brak danych** (linia 305): jeśli wiersz `dashboard.webinar_invite` nie istnieje w `feature_visibility` lub RLS blokuje odczyt, widżet domyślnie się pokazuje (`setMasterVisible(true)`).
2. **Renderowanie podczas ładowania** (linia 317): `masterVisible` startuje jako `null`, a warunek `if (masterVisible === false)` przepuszcza `null` — widżet renderuje się zanim dane się załadują.
3. **Pusta karta zawsze widoczna**: nawet gdy obie kategorie (BO/HC) zwrócą `null`, zewnętrzna karta z nagłówkiem "Zaproś Swojego Gościa" nadal się renderuje.

## Rozwiązanie

### Plik: `src/components/dashboard/widgets/WebinarInviteWidget.tsx`

**Zmiana 1 — domyślnie ukryty gdy brak danych:**
```tsx
// Linia 305: zmienić fallback z true na false
if (!data) { setMasterVisible(false); return; }
```

**Zmiana 2 — nie renderować podczas ładowania:**
```tsx
// Linia 317: blokować też null (loading state)
if (masterVisible !== true) return null;
```

Te dwie zmiany gwarantują, że:
- Widżet nie mignie na ekranie podczas ładowania
- Jeśli wiersz w bazie nie istnieje lub jest wyłączony, widżet się nie pokaże
- Admin ma pełną kontrolę przez `feature_visibility`

