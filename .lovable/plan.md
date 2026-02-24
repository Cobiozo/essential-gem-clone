

## Naprawa emaila admina - reset hasla

### Problem 1: Wyswietlanie adresu email admina
W szablonie `password_reset_admin` jest:
```
Administrator {{admin_name}} wygenerował dla Ciebie nowe hasło
```
Zmienna `{{admin_name}}` zawiera email admina. Nalezy zamienic na staly tekst "Administrator Pure Life Center".

### Problem 2: Przycisk "Zaloguj sie do systemu" nie dziala
W Edge Function `admin-reset-password` (linia 250):
```
const loginUrl = `${supabaseUrl.replace('/rest/v1', '')}/auth`;
```
To generuje URL typu `https://xzlhssqqbajqhnsmbucf.supabase.co/auth` -- czyli adres API Supabase, a nie aplikacji. Nalezy zamienic na `https://purelife.lovable.app/auth`.

### Plan zmian

**1. Migracja SQL -- aktualizacja szablonu `password_reset_admin`**

Zamiana tekstu w `body_html`:
- `Administrator <strong>{{admin_name}}</strong> wygenerował` -> `<strong>Administrator Pure Life Center</strong> wygenerował`

**2. Edge Function `supabase/functions/admin-reset-password/index.ts`**

Linia 250 -- zamiana:
```
const loginUrl = `${supabaseUrl.replace('/rest/v1', '')}/auth`;
```
na:
```
const loginUrl = 'https://purelife.lovable.app/auth';
```

Opcjonalnie: usunac `admin_name` ze zmiennych szablonu (juz niepotrzebne, bo tekst jest staly w HTML).

