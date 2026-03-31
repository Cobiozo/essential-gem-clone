
# Przywrócenie pełnych nazw sub-tabów na mobile

## Zmiana

Usunięcie wzorca `<span className="sm:hidden">skrót</span><span className="hidden sm:inline">pełna nazwa</span>` i zastąpienie go jednym tekstem z pełną nazwą — identycznie jak na desktopie.

## Plik: `src/components/team-contacts/TeamContactsTab.tsx`

**Linie 349-389** — 5 sub-tabów prywatnych:
- `Moja lista` / `Moja lista kontaktów` → po prostu `Moja lista kontaktów`
- `BO` / `Z zaproszeń na Business Opportunity` → `Z zaproszeń na Business Opportunity`
- `HC` / `Z zaproszeń na Health Conversation` → `Z zaproszeń na Health Conversation`
- `Webinary` / `Z zaproszeń na webinary ogólne` → `Z zaproszeń na webinary ogólne`
- `Strona` / `Z Mojej Strony Partnera` → `Z Mojej Strony Partnera`

Każda para `<span>` zostanie zastąpiona jednym tekstem. Kontener sub-tabów już ma `flex-wrap` więc długie nazwy będą się naturalnie zawijać.
