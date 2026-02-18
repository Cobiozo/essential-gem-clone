
# Naprawa widocznosci dropdown na szerszych telefonach

## Problem
Dropdown (Select) jest ukryty za pomoca klasy `sm:hidden`, a TabsList ma `hidden sm:grid`. Breakpoint `sm` w Tailwind to 640px. Urzadzenie uzytkownika ma ekran szerszy niz 640px (np. telefon w orientacji pionowej z wysoka rozdzielczoscia), wiec przegladarka pokazuje wersje desktopowa z nakladajacymi sie zakladkami zamiast dropdown.

## Rozwiazanie
Zmienic breakpoint z `sm` na `md` (768px), aby dropdown byl widoczny na wszystkich urzadzeniach mobilnych i mniejszych tabletach.

## Zmiany w pliku `src/components/admin/EventsManagement.tsx`

1. **Linia 544**: Zmienic `sm:hidden` na `md:hidden` - dropdown bedzie widoczny na ekranach do 768px
2. **Linia 575**: Zmienic `hidden sm:grid sm:grid-cols-7` na `hidden md:grid md:grid-cols-7` - zakladki beda widoczne dopiero od 768px

To sa dokladnie 2 zmiany klas CSS, bez modyfikacji logiki ani struktury komponentu.
