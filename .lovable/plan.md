## Cel
W formularzu „Dodaj klienta" / „Edytuj klienta" w **Bazie testów Omega** dodać 3 nowe **opcjonalne** pola:
1. **Numer testu** (np. ID/sygnatura testu nadana przez laboratorium)
2. **Numer listu przewozowego** (tracking number)
3. **Przewoźnik** — wybór z listy popularnych przewoźników i usługodawców pocztowych/kurierskich, z możliwością wpisania własnego.

## Zakres zmian

### 1. Baza danych — migracja
Dodanie 3 nowych nullowalnych kolumn do `public.omega_test_clients`:

```sql
ALTER TABLE public.omega_test_clients
  ADD COLUMN IF NOT EXISTS test_number       text,
  ADD COLUMN IF NOT EXISTS tracking_number   text,
  ADD COLUMN IF NOT EXISTS carrier           text;
```

Bez zmian w RLS (istniejące polityki obejmują wszystkie kolumny).

### 2. Lista przewoźników (stała w kodzie)
Plik: `src/lib/carriers.ts` (nowy) — stała lista posortowana alfabetycznie:

- **Polska poczta i kurierzy:** Poczta Polska, InPost (Paczkomat), InPost Kurier, DPD, DHL Express, DHL Parcel, GLS, UPS, FedEx, TNT, Pocztex, Orlen Paczka, Geis, X-press Couriers, Patron Service, Raben.
- **Międzynarodowe:** DHL, FedEx, UPS, TNT, Aramex, PostNL, Royal Mail, Deutsche Post, La Poste, Hermes, Yodel, USPS, Canada Post, Australia Post.
- Specjalna pozycja **„Inny / wpisz ręcznie"** — pokazuje pole tekstowe do wpisania nazwy.

### 3. UI — `ClientFormDialog.tsx`
- Dodać sekcję „Wysyłka testu (opcjonalnie)" pod polem Telefon, nad Notatką.
- Dwie kolumny: **Numer testu** | **Numer listu przewozowego** (Inputy).
- Pole **Przewoźnik** jako `Select` z listy + opcja „Inny / wpisz ręcznie" → po wybraniu wyświetla `Input` na własną nazwę.
- Logika edycji: jeśli wczytany `carrier` nie znajduje się na liście → automatycznie ustaw tryb „Inny" i wypełnij Input wartością z bazy.
- Wszystkie pola opcjonalne — `canSave` bez zmian (tylko imię + nazwisko wymagane).
- Trim i `null` dla pustych stringów przy zapisie.

### 4. Hook — `src/hooks/useOmegaTestClients.ts`
- Rozszerzyć interfejsy `OmegaTestClient` i `OmegaTestClientInput` o pola:
  - `test_number: string | null`
  - `tracking_number: string | null`
  - `carrier: string | null`
- Mutacje `addClient` / `updateClient` przekazują nowe pola bez modyfikacji (spread `...input` już to obsłuży).

### 5. Wyświetlanie (opcjonalnie, drobne)
W `ClientDetailDrawer.tsx` (jeśli sekcja danych klienta istnieje) — dodać podgląd 3 nowych pól, jeśli wypełnione. Sprawdzę plik przy implementacji; jeśli wyświetlenie wykracza poza prosty wgląd, ograniczę się do samego formularza i pominiemy renderowanie w drawerze (zgodnie z zakresem prośby — sama prośba dotyczy formularza dodawania).

## Pliki do utworzenia / edycji
- `supabase/migrations/<timestamp>_add_shipping_fields_to_omega_test_clients.sql` (nowy)
- `src/lib/carriers.ts` (nowy)
- `src/components/omega-tests/ClientFormDialog.tsx` (edycja)
- `src/hooks/useOmegaTestClients.ts` (edycja — typy)
- ewentualnie `src/components/omega-tests/ClientDetailDrawer.tsx` (edycja — podgląd)

## Uwagi
- Po migracji typy `src/integrations/supabase/types.ts` zostaną zregenerowane automatycznie.
- Lista przewoźników jest zaszyta w kodzie (proste, bez dodatkowej tabeli) — łatwa do rozszerzenia w przyszłości.
- Pola pozostają opcjonalne — istniejący przepływ dodawania klienta nie zostaje zmieniony pod kątem walidacji.
