
# Plan: Blokada prawego przycisku myszy w Bibliotece (Grafiki)

## Problem

Menu kontekstowe prawego przycisku myszy pojawia się na grafikach w Bibliotece, mimo że powinno być całkowicie zablokowane. Użytkownik może:
- Zapisać obraz przez "Zapisz jako"
- Kopiować obraz
- Otworzyć w nowej karcie

## Diagnoza

Strona `KnowledgeCenter.tsx` **nie używa** hooka `useSecurityPreventions`, który blokuje prawy przycisk myszy w innych częściach aplikacji (np. na stronie głównej, w panelu admina).

## Rozwiązanie

Dodanie hooka `useSecurityPreventions` do strony `KnowledgeCenter.tsx` oraz bezpośredniej blokady `onContextMenu` na elementach graficznych dla pewności.

---

## Zmiany techniczne

### 1. Plik `src/pages/KnowledgeCenter.tsx`

**Dodanie importu i użycia hooka:**

```tsx
// Na początku pliku - dodanie importu
import { useSecurityPreventions } from '@/hooks/useSecurityPreventions';

// W komponencie KnowledgeCenter, na początku
export default function KnowledgeCenter() {
  const { user } = useAuth();
  const { language } = useLanguage();
  
  // Dodanie blokady prawego przycisku
  useSecurityPreventions();
  
  // ... reszta kodu
}
```

### 2. Plik `src/components/share/GraphicsCard.tsx`

**Dodanie blokady na elemencie img dla pewności:**

```tsx
<img
  src={resource.source_url}
  alt={resource.title}
  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
  loading="lazy"
  onContextMenu={(e) => e.preventDefault()}
  draggable={false}
/>
```

### 3. Plik `src/components/share/SocialShareDialog.tsx`

**Dodanie blokady na podglądzie obrazu:**

```tsx
<img
  src={imageUrl}
  alt={title}
  className="w-full h-full object-contain"
  loading="lazy"
  onContextMenu={(e) => e.preventDefault()}
  draggable={false}
/>
```

---

## Podsumowanie zmian

| Plik | Zmiana |
|------|--------|
| `KnowledgeCenter.tsx` | Import i użycie `useSecurityPreventions()` |
| `GraphicsCard.tsx` | Dodanie `onContextMenu` i `draggable={false}` na img |
| `SocialShareDialog.tsx` | Dodanie `onContextMenu` i `draggable={false}` na img |

## Oczekiwany rezultat

- Prawy przycisk myszy nie będzie działał na całej stronie Biblioteki
- Grafiki nie będą mogły być przeciągane (drag & drop)
- Menu kontekstowe przeglądarki nie pojawi się na obrazkach
- Zabezpieczenie działa zarówno na miniaturkach jak i w dialogu podglądu
