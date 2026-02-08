
# Plan: Logo dla trybu jasnego/ciemnego + Podgląd strony rejestracji dla PureLinków

## Podsumowanie zmian

### Zmiana 1: Usunięcie dodanego h1 i dodanie obsługi logo dla dwóch trybów

**Problem:**
- Dodałem `<h1>PURE LIFE</h1>` pod logo, ale użytkownik chce aby tekst wbudowany w obrazek logo był widoczny
- Obrazek `header-1765311103942.png` zawiera czarny tekst "PURE LIFE" - niewidoczny w trybie ciemnym
- Potrzebne jest rozwiązanie z dwoma wariantami logo

**Rozwiązanie:**

1. **Dodać nowy wpis w bazie `system_texts`** dla logo w trybie ciemnym (`header_image_dark`)
2. **Zaktualizować `HeroSection.tsx`**:
   - Usunąć dodany `<h1>` (linie 90-93)
   - Dodać prop `headerImageDark` dla logo w trybie ciemnym
   - Wyświetlać odpowiedni obrazek w zależności od trybu (jasny/ciemny)
3. **Zaktualizować `Index.tsx`**:
   - Pobierać `header_image_dark` z `systemTextsData`
   - Przekazywać do `HeroSection`
4. **Zaktualizować panel admina** (edycja strony głównej):
   - Dodać pole do uploadu logo dla trybu ciemnego

**Pliki do edycji:**
- `src/components/HeroSection.tsx`
- `src/pages/Index.tsx`
- `src/components/admin/HomePageSettings.tsx` (jeśli istnieje)

---

### Zmiana 2: Przycisk podglądu strony rejestracji dla PureLinków

**Problem:**
- Użytkownik chce zobaczyć jak wygląda strona rejestracji gdy ktoś użyje jego PureLinku
- Brakuje przycisku podglądu obok QR code i przycisku kopiowania

**Rozwiązanie:**

Dodać przycisk z ikoną `Eye` (oko) obok QR i Copy, który otwiera nową kartę ze stroną `/auth?ref=REFLINK_CODE` jako podgląd.

**Plik:** `src/components/user-reflinks/UserReflinksPanel.tsx`

Zmiana w sekcji akcji (linie 285-318):

```tsx
<div className="flex items-center gap-2 shrink-0">
  <ReflinkQRCode 
    reflinkCode={reflink.reflink_code} 
    targetRole={reflink.target_role} 
  />
  {/* NOWY: Przycisk podglądu */}
  <Button
    size="sm"
    variant="ghost"
    onClick={() => window.open(`/auth?ref=${reflink.reflink_code}`, '_blank')}
    title="Podgląd strony rejestracji"
  >
    <Eye className="w-4 h-4" />
  </Button>
  {isExpired ? (
    // ... existing extend button
  ) : (
    // ... existing copy button and switch
  )}
</div>
```

---

## Szczegóły techniczne

### Baza danych

Nowy rekord w `system_texts`:

```sql
INSERT INTO system_texts (type, content, is_active) 
VALUES ('header_image_dark', '', true);
```

### HeroSection.tsx - zmiany

```tsx
interface HeroSectionProps {
  headerImage: string;
  headerImageDark?: string;  // NOWY prop
  headerText: string;
  // ... reszta
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  headerImage,
  headerImageDark,  // NOWY
  // ...
}) => {
  // Wykrycie trybu ciemnego
  const isDarkMode = useTheme().theme === 'dark' || 
    (useTheme().theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  // Wybór odpowiedniego logo
  const activeImage = isDarkMode && headerImageDark ? headerImageDark : headerImage;

  return (
    // ...
    <img src={activeImage} alt="Pure Life" ... />
    // USUNIĘTY <h1>
  );
};
```

### Index.tsx - zmiany

```tsx
const { headerText, authorText, siteLogo, headerImage, headerImageDark, ... } = useMemo(() => {
  // ...
  const headerImageDarkSystemText = systemTextsData.find(item => item.type === 'header_image_dark');
  
  return {
    // ...
    headerImageDark: headerImageDarkSystemText?.content || '',
  };
}, [systemTextsData]);

<HeroSection 
  headerImage={headerImage || niezbednikLogo}
  headerImageDark={headerImageDark}  // NOWY
  // ...
/>
```

### UserReflinksPanel.tsx - zmiany

Import:
```tsx
import { Link2, Plus, Copy, Check, RefreshCw, MousePointer, UserPlus, Info, BarChart3, Calendar, Eye } from 'lucide-react';
```

Nowy przycisk:
```tsx
<Button
  size="sm"
  variant="ghost"
  onClick={() => window.open(`/auth?ref=${reflink.reflink_code}`, '_blank')}
  title="Podgląd strony rejestracji"
>
  <Eye className="w-4 h-4" />
</Button>
```

---

## Pliki do edycji

| Plik | Zmiana |
|------|--------|
| `src/components/HeroSection.tsx` | Usunięcie h1, dodanie obsługi headerImageDark |
| `src/pages/Index.tsx` | Pobieranie headerImageDark, przekazanie do HeroSection |
| `src/components/user-reflinks/UserReflinksPanel.tsx` | Dodanie przycisku podglądu z ikoną Eye |
| Migracja SQL | Dodanie rekordu header_image_dark do system_texts |
| Panel admina (opcjonalnie) | Pole uploadu dla logo ciemnego trybu |

---

## Oczekiwany efekt

1. **Logo na stronie głównej**:
   - W trybie jasnym: wyświetla `header_image` (aktualne logo z czarnym tekstem)
   - W trybie ciemnym: wyświetla `header_image_dark` (logo z białym/jasnym tekstem) jeśli ustawione, w przeciwnym razie fallback do normalnego
   
2. **Brak duplikatu h1**: Usunięty dodany tekst "PURE LIFE" pod logo

3. **Podgląd PureLinku**: Przycisk z ikoną oka pozwala zobaczyć stronę rejestracji tak jak widzi ją nowy użytkownik wchodzący przez link polecający
