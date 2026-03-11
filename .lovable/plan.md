

## Plan zmian

### 1. Logo na ekranie ładowania (App.tsx)

Ekran ładowania ról (linia 294-308 w `App.tsx`) używa generycznego spinnera CSS bez logo. Trzeba dodać import nowego logo `pure-life-droplet-new.png` i wyświetlić je na ekranie ładowania — analogicznie do tego, co widać na screenshocie (logo + tekst "Ładowanie...").

**Plik: `src/App.tsx`**
- Dodać import: `import newPureLifeLogo from '@/assets/pure-life-droplet-new.png';`
- Zamienić spinner CSS na obrazek logo + animowany spinner pod spodem
- Zachować tekst "Ładowanie..."

### 2. Złote ikony dla datetime-local (index.css)

CSS w `index.css` celuje tylko w `input[type="date"]` i `input[type="time"]`, ale w aplikacji większość selektorów dat to `type="datetime-local"`. Dlatego ikony w formularzach (np. tworzenie wydarzeń) nie mają złotego koloru.

**Plik: `src/index.css`**
- Dodać `input[type="datetime-local"]::-webkit-calendar-picker-indicator` do istniejącej reguły golden icon
- Dodać `input[type="datetime-local"]` do reguły padding-right
- Dodać `.dark input[type="datetime-local"]` do reguły color-scheme

### Zakres: 2 pliki, ~10 linii zmian

