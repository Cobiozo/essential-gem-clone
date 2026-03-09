
# Naprawa duplikatów w widoku rejestracji na wydarzenia

## Analiza problemu

Elżbieta Dąbrowska ma **5 rejestracji** na wydarzenie cykliczne "Network Marketing Mastery" — po jednej na każdy termin (occurrence_index 0-4). To jest **poprawne zachowanie** — użytkownik zapisał się na 5 terminów tego samego wydarzenia cyklicznego.

Problem polega na tym, że widok admina "Rejestracje na wydarzenia" wyświetla **każdy termin jako osobny wiersz**, co wygląda jak duplikaty. Ta sama osoba pojawia się 5 razy z identycznymi danymi.

## Rozwiązanie

Zgrupować rejestracje **per unikalna osoba** w widoku admina. Zamiast 5 wierszy dla Elżbiety, wyświetlić 1 wiersz z informacją o liczbie zapisanych terminów.

### Zmiany w `src/components/admin/EventRegistrationsManagement.tsx`:

1. **Grupowanie rejestracji po `user_id`** — w `filteredRegistrations` zamiast wyświetlać surowe wiersze, zgrupować je:
   - Jeden wiersz per `user_id`
   - Kolumna "Termin" pokaże liczbę terminów (np. "5 terminów") lub listę dat
   - Status: "Zapisany" jeśli przynajmniej jedna rejestracja aktywna
   - Data zapisu: najwcześniejsza `registered_at`

2. **Dodanie możliwości rozwinięcia** — kliknięcie wiersza pokaże szczegóły poszczególnych terminów (opcjonalnie, w drugiej iteracji)

3. **Statystyki** — `userStats.total` już liczy unikalne `user_id`, więc statystyki są poprawne; jedynie tabela wymaga deduplikacji

### Konkretna implementacja:

```typescript
// Group registrations by user_id
const groupedRegistrations = useMemo(() => {
  const groups = new Map<string, EventRegistration[]>();
  for (const reg of filteredRegistrations) {
    const existing = groups.get(reg.user_id) || [];
    existing.push(reg);
    groups.set(reg.user_id, existing);
  }
  return Array.from(groups.entries()).map(([userId, regs]) => ({
    ...regs[0], // Base data from first registration
    allRegistrations: regs,
    occurrenceCount: regs.length,
    activeCount: regs.filter(r => r.status === 'registered').length,
  }));
}, [filteredRegistrations]);
```

W tabeli zamiast `filteredRegistrations.map(...)` użyć `groupedRegistrations.map(...)`, a kolumna "Termin" wyświetli:
- Jeśli 1 termin → datę
- Jeśli >1 → "X terminów" jako badge

### Zapobieganie na przyszłość

Brak potrzeby zmian w logice rejestracji — wielokrotna rejestracja na różne terminy tego samego wydarzenia to zamierzone zachowanie. Problem dotyczy wyłącznie **prezentacji danych** w panelu admina.

**Plik do edycji:** `src/components/admin/EventRegistrationsManagement.tsx`
