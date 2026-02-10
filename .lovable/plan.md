

# Poprawki wizualnych odznak rol w czacie

## Zmiany w `src/components/chat/RoleBadgedAvatar.tsx`

### 1. Wieksze awatary
Zwiekszenie rozmiarow w `SIZE_MAP`:
- `sm`: z `h-7 w-7` na `h-9 w-9` (badge z `w-3.5 h-3.5` na `w-4 h-4`)
- `md`: z `h-9 w-9` na `h-11 w-11` (badge z `w-4 h-4` na `w-4.5 h-4.5`)

### 2. Usuniecie ikon z odznak — z wyjatkiem Administratora
Zmiana logiki renderowania naroznego badge:
- Tylko rola `admin` wyswietla ikone (Shield) w naroznym kole
- Dla pozostalych rol (lider, partner, specjalista, klient) — badge narozny jest nadal widoczny jako kolorowe kolko (identyfikacja roli), ale **bez ikony w srodku**
- Alternatywnie: calkowite usuniecie badge naroznego dla nie-adminow, pozostawiajac jedynie kolorowa obramowke (`ring`) jako identyfikator roli

### 3. Kolor Partnera: srebrzysta zamiast brazowej
Zmiana w `ROLE_CONFIG`:
- `partner.ring`: z `ring-orange-700` na `ring-neutral-400` (srebrzysta obramowka)
- `partner.bg`: z `bg-orange-700` na `bg-neutral-400` (jesli badge zostaje)

### 4. Logika Lidera
Komponent juz obsluguje logike `isLeader` — partner z `isLeader === true` otrzymuje zlota odznake Lidera. Hook `useUnifiedChat` sprawdza `leader_permissions.can_broadcast` i ustawia `isLeader: true`. Sebastian Snopek (partner z uprawnieniami broadcast) bedzie poprawnie oznaczony jako Lider ze zlota gwiazdka — pod warunkiem ze ma `can_broadcast = true` w tabeli `leader_permissions`.

## Podsumowanie wizualne

| Rola        | Obramowka (ring)     | Badge narozny       |
|-------------|---------------------|---------------------|
| Admin       | czerwona (`red-500`) | czerwone kolko + Shield |
| Lider       | zlota (`amber-500`)  | tylko kolorowe kolko |
| Partner     | srebrzysta (`neutral-400`) | tylko kolorowe kolko |
| Specjalista | niebieska (`blue-500`) | tylko kolorowe kolko |
| Klient      | zielona (`green-500`) | tylko kolorowe kolko |

## Plik do edycji
- `src/components/chat/RoleBadgedAvatar.tsx` — jedyny plik wymagajacy zmian

