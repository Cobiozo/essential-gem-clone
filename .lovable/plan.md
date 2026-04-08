

# Fix: Admin nie widzi użytkowników z rolą `client` w zarządzaniu auto-webinarem

## Problem

Jan Koterski ma rolę `client` w tabeli `user_roles`. Admin widok filtruje tylko użytkowników z rolami `partner` i `specjalista` (linia 35). Dlatego Koterski (i każdy inny `client` z nadanym dostępem przez lidera) jest niewidoczny.

## Rozwiązanie

Zmienić podejście w `AutoWebinarAccessManagement.tsx`: zamiast filtrować po rolach, pokazywać **wszystkich użytkowników, którzy mają wpis w `leader_permissions` z `can_access_auto_webinar = true`**, niezależnie od roli. Dodatkowo w kolumnie "Bez dostępu" nadal pokazywać partnerów i specjalistów (bo to potencjalni kandydaci do nadania).

Konkretnie:

### `src/components/admin/AutoWebinarAccessManagement.tsx`

1. Zmienić zapytanie o role — dodać `client`:
   ```
   .in('role', ['partner', 'specjalista', 'client'])
   ```

2. Alternatywnie (lepsze podejście): przy budowaniu listy `partners`, dodać użytkowników, którzy mają `can_access_auto_webinar = true` w `leader_permissions`, nawet jeśli nie mają roli partner/specjalista. Dzięki temu admin widzi każdego, komu ktokolwiek nadał dostęp.

3. W kolumnie "Z dostępem" wyświetlać badge z rzeczywistą rolą użytkownika (Partner / Specjalista / Klient).

## Plik do zmiany

| Plik | Zmiana |
|------|--------|
| `src/components/admin/AutoWebinarAccessManagement.tsx` | Rozszerzyć filtr ról o `client` + uwzględnić użytkowników z aktywnym dostępem niezależnie od roli |

