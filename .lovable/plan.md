

# Zmiany w formularzu kontaktu prywatnego

## 1. Złota ikonka kalendarza na polach daty
Pola `type="date"` (added_at, next_contact_date, reminder_date) mają natywną ikonkę kalendarza, która jest słabo widoczna na ciemnym tle. Rozwiązanie: dodanie CSS stylów do tych inputów, aby ikonka kalendarza była złota. Użyję klasy Tailwind z custom CSS (`[&::-webkit-calendar-picker-indicator]`) aby nadać filtr koloru złotego na ikonkę.

Klasa do dodania na każdym `Input type="date"`:
```
className="[&::-webkit-calendar-picker-indicator]:brightness-0 [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:sepia [&::-webkit-calendar-picker-indicator]:saturate-[10] [&::-webkit-calendar-picker-indicator]:hue-rotate-[15deg]"
```

## 2. Nowe opcje statusu relacji
Zamiana SelectItem w sekcji "Status relacji":
- `observation` → "Czynny obserwujący"
- `potential_client` → "Potencjalny klient"  
- `potential_partner` → "Potencjalny partner"
- `closed_success` → "Zamknięty - sukces dołączył"
- `closed_not_now` → "Zamknięty - nie teraz"

Usunięcie: "Klient" (active), "Potencjalny specjalista". Dodanie: "Potencjalny klient". Aktualizacja domyślnej wartości na `observation`. Aktualizacja typu w `types.ts`.

## 3. Zamiana kolejności pól
Przenieść "Dlaczego chcesz się odezwać" (contact_reason) **powyżej** "Zainteresowanie produktami" (products). Obecna kolejność: source → products → reason. Nowa: source → reason → products.

## Pliki do zmiany
- `src/components/team-contacts/PrivateContactForm.tsx` — wszystkie 3 zmiany
- `src/components/team-contacts/types.ts` — aktualizacja `relationship_status` enum (dodanie `potential_client`, usunięcie `active`, `potential_specialist`, `suspended`)

