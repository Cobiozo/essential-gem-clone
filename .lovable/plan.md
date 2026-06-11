## Cel
W widoku „Struktura całej platformy" (admin) kliknięcie wiersza użytkownika otwiera modal ze szczegółami tego użytkownika.

## Zmiany

### 1. Nowy komponent `src/components/admin/PlatformUserDetailsDialog.tsx`
Modal (shadcn `Dialog`) z pełnymi danymi `profiles` + role + relacje:

- **Nagłówek**: avatar (`avatar_url` lub inicjały), pełne imię i nazwisko, badges ról (te same kolory co w drzewie), status `Aktywny`/`Zablokowany`.
- **Sekcja Kontakt**: email (link `mailto:`), telefon (link `tel:`), miasto/kraj, data rejestracji, ostatnie logowanie.
- **Sekcja Konto**: `user_id` (mono, copy-to-clipboard), `eq_id`, `upline_eq_id` + imię uplinea (lookup z drzewa), liczba bezpośrednich (directCount) i całego downline (Σ).
- **Sekcja Dodatkowe pola profilu** (jeżeli ustawione): `team_id`/nazwa zespołu jeśli dostępna, kraj, język, data ostatniej aktywności, `blocked_at`.
- **Stopka**: przyciski „Zobacz w panelu admina" (link do `/admin?tab=users&search={eq_id|email}`), „Wyślij e-mail" (mailto), „Zamknij".

Dane bierzemy z `PlatformNode` już dostępnego w drzewie — bez dodatkowych zapytań. Telefon/email są już w `profile`.

### 2. Edycja `src/components/admin/PlatformStructureView.tsx`
- Dodać stan `selectedNode: PlatformNode | null`.
- W `renderNode` zamienić zewnętrzny `div` wiersza na klikalny element (`role="button"`, `tabIndex={0}`, kursor `cursor-pointer`, hover `hover:bg-muted/50`).
- Kliknięcie chevrona dalej tylko zwija/rozwija (`onClick` z `e.stopPropagation()`). Kliknięcie reszty wiersza → `setSelectedNode(n)`.
- Linki email/telefon w wierszu rozwiniętym też `stopPropagation`, żeby nie otwierały modala.
- Na końcu komponentu renderować `<PlatformUserDetailsDialog node={selectedNode} onOpenChange={...} />`.

### 3. Bez zmian w bazie i RLS
Dane są już ładowane przez istniejące zapytania `fetchProfiles` / `fetchRoles`.

## Weryfikacja
- Klik na wiersz → otwiera się modal z pełnymi danymi.
- Klik na chevron → tylko zwija/rozwija, modal się nie otwiera.
- Klik na link e-mail/telefon → otwiera klienta poczty/dzwoni, bez modala.
- Działa na desktop i mobile (`max-w-lg`, scroll w środku).
