

# Plan: Offline queue + fix kontaktu prywatnego

## Problem 1: Nie można dodać kontaktu prywatnego

Na screenshocie widoczny toast "Nie udało się dodać kontaktu". Bez logów konsoli nie mogę zidentyfikować dokładnego błędu Supabase. Jedak najlepszym podejściem jest **dodanie lepszego logowania błędów** do `addContact` w `useTeamContacts.ts`, żeby w toaście wyświetlał się konkretny komunikat z bazy (np. naruszenie CHECK, RLS, brak sesji).

Aktualny kod:
```typescript
toast({ title: 'Błąd', description: 'Nie udało się dodać kontaktu' });
```

Zmiana — pokazanie rzeczywistego komunikatu błędu:
```typescript
toast({ title: 'Błąd', description: error.message || 'Nie udało się dodać kontaktu' });
```

Dodatkowo dodam `console.error` z pełnym obiektem błędu, żeby łatwiej diagnozować.

## Problem 2: Offline queue (Plan B z wcześniejszego planu)

### Nowe pliki

**`src/hooks/useOfflineQueue.ts`**
- Kolejka w `localStorage` pod kluczem `offline_contacts_queue`
- Nasłuchuje `window.addEventListener('online', sync)`
- Funkcja `enqueue(contactData)` — zapisuje do localStorage
- Funkcja `sync()` — wysyła oczekujące kontakty do Supabase, po sukcesie usuwa z kolejki
- Zwraca: `{ pendingCount, enqueue, sync }`

### Modyfikacje

**`src/hooks/useTeamContacts.ts`** — zmiana `addContact`:
- Jeśli `!navigator.onLine` LUB błąd sieciowy (np. `TypeError: Failed to fetch`) → `enqueue(contactData)` zamiast toasta błędu
- Toast: "Kontakt zapisany offline — zostanie zsynchronizowany automatycznie"
- Po powrocie online i syncu → `refetch()` + toast sukcesu

**`src/components/team-contacts/TeamContactsTab.tsx`**:
- Dodanie banera informacyjnego gdy `pendingCount > 0`: "X kontaktów czeka na synchronizację"
- Po syncu baner znika

### Logika synchronizacji
1. `window.addEventListener('online')` → uruchom sync
2. Dla każdego elementu w kolejce: `supabase.from('team_contacts').insert(...)` 
3. Sukces → usuń z kolejki + dodaj history entry
4. Błąd nie-sieciowy → usuń z kolejki (nie ponawiaj, pokaż błąd)
5. Błąd sieciowy → zostaw w kolejce
6. Na koniec → `refetch()` + toast z podsumowaniem

### Bezpieczeństwo
- Queue przechowuje dane lokalne, nie tokeny/hasła
- Maksymalny rozmiar kolejki: 50 kontaktów (ochrona przed zapełnieniem localStorage)
- Kontakty zsynchronizowane z aktualnym `user.id` w momencie syncu (nie w momencie zapisu offline)

