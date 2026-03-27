

## Diagnoza: Dlaczego statystyki gości nie rejestrują dołączenia

### Dowody z bazy danych
- Tabela `auto_webinar_views` ma **ZERO** rekordów gości (`is_guest=true` lub `guest_email IS NOT NULL`)
- Wszystkie istniejące rekordy to admin (user_id: 629a2d9a...) — gościom nigdy nie zapisał się rekord widoku
- Rejestracje gości (`guest_event_registrations`) istnieją poprawnie (Dorota, Januszek, etc.)

### Zidentyfikowane przyczyny (4 błędy)

**1. Brak try-catch w `createView` — deadlock mutex** (`useAutoWebinarTracking.ts`)
- `createView` ustawia `creatingRef.current = true` na początku
- Jeśli `supabase.auth.getUser()` dla anon gościa zwróci błąd/throw, funkcja przerywa się BEZ ustawienia `creatingRef.current = false`
- Mutex blokuje się na zawsze — żaden kolejny film w sesji nie zapisze widoku
- Brak console.error — błąd jest niewidoczny

**2. Race condition: `guestRegistrationId` jest null przy tworzeniu widoku**
- `guestRegistrationId` rozwiązuje się asynchronicznie (zapytanie do `guest_event_registrations`)
- Ale `createView` odpala się natychmiast gdy `isPlaying` staje się `true` — zanim registration_id zdąży się załadować
- Raz utworzony rekord nigdy nie jest aktualizowany o poprawne `guest_registration_id`
- Efekt: nawet gdyby widoki się tworzyły, nie mają `guest_registration_id` → panel statystyk i kontakty partnera nie mogą ich dopasować

**3. Panel statystyk ignoruje kategorię** (`AutoWebinarGuestStats.tsx`)
- Linia 38-42: `supabase.from('auto_webinar_config').select('event_id').limit(1)` — bez filtra kategorii
- Pobiera losowy config (BO lub HC), więc statystyki mogą pokazywać gości z niewłaściwej kategorii
- Komponent nie przyjmuje prop `category` od rodzica

**4. Brak RLS SELECT dla anon — sesja gościa nie wykrywana**
- RLS na `auto_webinar_views` ma SELECT policy tylko dla `authenticated` (admin + team contacts)
- Anon (goście) nie mogą odczytać swoich widoków
- Sprawdzenie istniejącej sesji (linie 55-62, 82-88 w AutoWebinarEmbed) zawsze zwraca `null` dla gości
- Skutek: goście nie mogą dołączyć ponownie po odświeżeniu strony (rejoin detection nie działa)

```text
Przepływ gościa:
1. Gość rejestruje się → guest_event_registrations ✓
2. Gość wchodzi na stronę → useAutoWebinarTracking inicjalizuje się
3. guestRegistrationId zaczyna się ładować asynchronicznie...
4. effectiveIsPlaying = true → createView() odpala ZANIM guestRegistrationId zdąży się załadować
5. createView() → supabase.auth.getUser() → THROW/ERROR dla anon (brak sesji)
6. creatingRef.current = true → DEADLOCK → nigdy więcej nie spróbuje
7. Wynik: ZERO rekordów gościa w auto_webinar_views
```

---

## Plan naprawy

### 1. Fix `useAutoWebinarTracking.ts` — niezawodny zapis widoków gości
- Owinąć `createView` w try-catch z `finally { creatingRef.current = false }` (zabezpieczenie mutex)
- Pominąć `getUser()` gdy `isGuest=true` — gość nie ma sesji auth, nie potrzebuje `user_id`
- Użyć refs dla `guestEmail` i `guestRegistrationId` zamiast zamykania w closure
- Dodać `useEffect` który aktualizuje istniejący widok gdy `guestRegistrationId` rozwiąże się po utworzeniu

### 2. Fix `AutoWebinarGuestStats.tsx` — filtrowanie po kategorii
- Dodać prop `category: 'business_opportunity' | 'health_conversation'`
- Filtrować config query: `.eq('category', category)`

### 3. Fix `AutoWebinarManagement.tsx` — przekazać category
- Zmienić `<AutoWebinarGuestStats />` na `<AutoWebinarGuestStats category={category} />`

### 4. Migracja DB — dodać RLS SELECT dla anon (po session_id)
- Nowa policy: anon users mogą SELECT rekordy gdzie `session_id` matches
- Umożliwi gościom wykrywanie istniejącej sesji (rejoin po odświeżeniu)

### Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `src/hooks/useAutoWebinarTracking.ts` | try-catch, refs, skip getUser() dla gości, update registration_id |
| `src/components/admin/AutoWebinarGuestStats.tsx` | Prop category, filtrowanie config |
| `src/components/admin/AutoWebinarManagement.tsx` | Przekazanie category do GuestStats |
| Migracja SQL | RLS SELECT policy dla anon na auto_webinar_views |

### Efekt
- Widoki gości będą zapisywane w 100% przypadków
- `guest_registration_id` będzie uzupełniany gdy dostępny
- Statystyki w panelu admina będą precyzyjne per kategoria
- Kontakty partnera pokażą poprawne dane "Dołączył" + czas oglądania
- Goście będą mogli dołączyć ponownie po odświeżeniu strony

