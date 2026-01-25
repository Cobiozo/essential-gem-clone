
# Plan: Naprawa widoczności zegarków w dark mode i porządkowanie paska zakładek

## Zidentyfikowane problemy

### 1. Zegary niewidoczne w trybie ciemnym
Na screenshotach widać, że w polach `<input type="time">` ikona zegarka (natywna ikona przeglądarki) jest niewidoczna w dark mode. To dlatego, że natywny time picker używa czarnych ikon, które znikają na ciemnym tle.

### 2. Chaotyczny pasek zakładek
Na screenshocie `image-108.png` widać, że zakładki "PureLinki" i "Spotkania indywidualne" nachodzą na siebie (tekst "PureLinkiSpotkania indywidualne"). Problem wynika z:
- Za dużo zakładek w jednym rzędzie
- Użycie `gridTemplateColumns: repeat(N, minmax(0, 1fr))` powoduje kompresję tekstów
- Brak responsywnego zawijania

---

## Rozwiązanie

### 1. Naprawa zegarków - CSS dla dark mode

Dodanie stylów w `index.css` wymuszających widoczność ikon natywnego time pickera:

```css
/* Fix time input icons in dark mode */
.dark input[type="time"]::-webkit-calendar-picker-indicator {
  filter: invert(1);
}
```

To odwróci kolory ikon zegarka w dark mode, czyniąc je widocznymi.

### 2. Naprawa paska zakładek

**Opcja A: Poziome przewijanie (ScrollArea)**
Zamiana grid na flex z poziomym przewijaniem:

```tsx
<TabsList className="flex w-full overflow-x-auto">
  {/* tabs */}
</TabsList>
```

**Opcja B: Zawijanie na wiele rzędów**
Zmiana na flex-wrap dla wielu rzędów:

```tsx
<TabsList className="flex flex-wrap h-auto gap-1">
  {/* tabs */}
</TabsList>
```

Rekomendacja: **Opcja A (przewijanie)** - bardziej kompaktowe, standardowe w aplikacjach.

---

## Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/index.css` | Dodanie CSS fix dla time input icons w dark mode |
| `src/pages/MyAccount.tsx` | Zmiana TabsList z grid na flex z przewijaniem |

---

## Szczegóły techniczne

### Plik: `src/index.css`

Dodanie na końcu sekcji `@layer utilities`:

```css
/* Fix time input icons in dark mode */
.dark input[type="time"]::-webkit-calendar-picker-indicator {
  filter: invert(1);
  cursor: pointer;
}

.dark input[type="date"]::-webkit-calendar-picker-indicator {
  filter: invert(1);
  cursor: pointer;
}

/* Firefox support */
.dark input[type="time"],
.dark input[type="date"] {
  color-scheme: dark;
}
```

### Plik: `src/pages/MyAccount.tsx`

Zmiana linii 526 z:
```tsx
<TabsList className={`grid w-full`} style={{ gridTemplateColumns: `repeat(${visibleTabCount}, minmax(0, 1fr))` }}>
```

Na:
```tsx
<TabsList className="flex w-full h-auto flex-wrap gap-1 p-2">
```

I usunięcie dynamicznego `style` - flex-wrap automatycznie obsłuży dowolną liczbę zakładek.

Dodatkowo, TabsTrigger powinny mieć `whitespace-nowrap` (już mają w komponencie bazowym) oraz nie powinny się nadmiernie kurczyć.

---

## Efekt końcowy

1. **Zegary widoczne** - ikony zegarków będą białe w dark mode dzięki `filter: invert(1)`
2. **Uporządkowane zakładki** - zakładki będą się zawijać do nowych rzędów gdy zabraknie miejsca, bez nachodzenia na siebie
3. **Responsywność** - na mniejszych ekranach zakładki automatycznie przejdą do kolejnych rzędów

---

## Wizualizacja naprawy zakładek

```text
PRZED (chaos, nachodzenie):
┌────────────────────────────────────────────────────────────────┐
│ Profil | Pure – Kontakty | ... | PureLinkiSpotkania indywidual │
└────────────────────────────────────────────────────────────────┘

PO (flex-wrap):
┌────────────────────────────────────────────────────────────────┐
│ Profil | Pure – Kontakty | Komunikacja | Powiadomienia | ...   │
│ Bezpieczeństwo | Moje kody ZW | PureLinki | Spotkania indywid. │
└────────────────────────────────────────────────────────────────┘
```
