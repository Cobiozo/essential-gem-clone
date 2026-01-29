
# Plan: Dodanie globalnego zarządzania PureLinkami w panelu admina

## Problem
Niektóre istniejące purelinki (szczególnie dla specjalistów) wymagają ręcznego wyłączenia i włączenia aby zaczęły działać poprawnie. To może być spowodowane:
1. Cache przeglądarki przechowującym stare odpowiedzi
2. Stanem linków przed wdrożeniem nowej funkcji RPC `get_reflink_with_creator`

## Rozwiązanie
Dodanie nowej sekcji w panelu ustawień purelinków (`UserReflinksSettings.tsx`) z przyciskiem **"Odśwież wszystkie aktywne linki"**, który:
1. Zaktualizuje pole `updated_at` dla wszystkich aktywnych purelinków
2. Opcjonalnie - przedłuży ważność linków które wkrótce wygasają
3. Wyświetli statystyki ile linków zostało odświeżonych

---

## Zmiany techniczne

### 1. Nowa funkcja SQL: `refresh_all_active_reflinks`

Funkcja SECURITY DEFINER dostępna tylko dla adminów:

```sql
CREATE OR REPLACE FUNCTION public.refresh_all_active_reflinks()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count integer;
BEGIN
  -- Sprawdź czy użytkownik jest adminem
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can refresh all reflinks';
  END IF;

  -- Zaktualizuj updated_at dla wszystkich aktywnych linków
  UPDATE user_reflinks
  SET updated_at = now()
  WHERE is_active = true
    AND expires_at > now();
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RETURN json_build_object('updated_count', updated_count);
END;
$$;
```

### 2. Modyfikacja `UserReflinksSettings.tsx`

Dodanie nowej karty z przyciskiem odświeżania:

```tsx
// Nowa sekcja po istniejących kartach
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <RefreshCw className="w-5 h-5" />
      Zarządzanie globalne
    </CardTitle>
    <CardDescription>
      Odśwież wszystkie aktywne purelinki aby naprawić ewentualne problemy
    </CardDescription>
  </CardHeader>
  <CardContent>
    <div className="flex items-center gap-4">
      <Button 
        onClick={handleRefreshAllReflinks} 
        disabled={refreshing}
        variant="outline"
      >
        <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
        Odśwież wszystkie aktywne linki
      </Button>
      {lastRefreshStats && (
        <Badge variant="secondary">
          Odświeżono: {lastRefreshStats.updated_count} linków
        </Badge>
      )}
    </div>
    <p className="text-xs text-muted-foreground mt-2">
      Ta operacja zaktualizuje znacznik czasu dla wszystkich aktywnych purelinków.
      Użyj tego jeśli linki nie działają poprawnie.
    </p>
  </CardContent>
</Card>
```

### 3. Logika odświeżania w komponencie

```typescript
const [refreshing, setRefreshing] = useState(false);
const [lastRefreshStats, setLastRefreshStats] = useState<{updated_count: number} | null>(null);

const handleRefreshAllReflinks = async () => {
  if (refreshing) return;
  setRefreshing(true);
  try {
    const { data, error } = await supabase.rpc('refresh_all_active_reflinks');
    
    if (error) throw error;
    
    setLastRefreshStats(data);
    toast({
      title: 'Odświeżono',
      description: `Zaktualizowano ${data.updated_count} aktywnych linków`,
    });
  } catch (error: any) {
    toast({
      title: 'Błąd',
      description: error.message,
      variant: 'destructive',
    });
  } finally {
    setRefreshing(false);
  }
};
```

---

## Lista plików do modyfikacji

| Plik | Zmiana |
|------|--------|
| Migracja SQL | Nowa funkcja `refresh_all_active_reflinks` |
| `src/components/admin/UserReflinksSettings.tsx` | Nowa sekcja z przyciskiem odświeżania |
| `src/integrations/supabase/types.ts` | Automatycznie zaktualizowane typy dla nowej funkcji RPC |

---

## Weryfikacja po wdrożeniu

1. Zaloguj się jako Admin
2. Przejdź do ustawień purelinków
3. Kliknij "Odśwież wszystkie aktywne linki"
4. Sprawdź że wyświetla się liczba odświeżonych linków
5. Przetestuj link dla specjalisty - powinien teraz działać bez konieczności ręcznego wyłączania/włączania

---

## Bezpieczeństwo

- Funkcja SQL sprawdza czy użytkownik ma rolę `admin` przed wykonaniem operacji
- Używa `SECURITY DEFINER` z jawnym `SET search_path = public`
- Operacja dotyczy tylko aktywnych, niewygasłych linków
- Nie zmienia żadnych krytycznych danych - tylko `updated_at`
