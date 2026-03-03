
# Formularz kontaktu prywatnego — jedna kolumna + nowe pola

## Zmiany

### 1. Migracja DB — dodanie dwóch kolumn do `team_contacts`
- `contact_source TEXT` — skąd jest kontakt (Facebook, Instagram, basen, zawody, itp.)
- `contact_reason TEXT` — dlaczego chcesz się odezwać do tej osoby

### 2. Przebudowa `PrivateContactForm.tsx`
Usunięcie zakładek (Tabs). Wszystkie pola w jednej kolumnie, scrollowalne w dialogu:

```
Imię *              Nazwisko *
Telefon             Email
Zawód               Status relacji
Adres
Skąd jest kontakt (np. Facebook, Instagram, basen, zawody)
Zainteresowanie produktami
Dlaczego chcesz się odezwać (textarea)
Notatki z rozmów (textarea)
Data pierwszego kontaktu
Data kolejnego kontaktu
Data przypomnienia
Treść przypomnienia (textarea)
[Anuluj] [Dodaj kontakt]
```

Pary Imię/Nazwisko, Telefon/Email, Zawód/Status — w `grid-cols-2`. Reszta pól w jednej kolumnie. Sekcje oddzielone separatorami z nagłówkami.

### 3. Aktualizacja typów
Dodanie `contact_source` i `contact_reason` do `TeamContact` w `types.ts`.

## Pliki do zmiany
- **Nowa migracja SQL** — `ALTER TABLE team_contacts ADD COLUMN contact_source TEXT, ADD COLUMN contact_reason TEXT`
- **`src/components/team-contacts/PrivateContactForm.tsx`** — usunięcie Tabs, layout jednokolumnowy, dwa nowe pola
- **`src/components/team-contacts/types.ts`** — dodanie `contact_source` i `contact_reason`
- **`src/integrations/supabase/types.ts`** — auto-update po migracji
