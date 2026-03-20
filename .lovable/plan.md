

# Plan: Wieloliniowe pola tekstowe w kafelku partnera

## Cel
Zamienić pola `Input` (jednoliniowe) na `Textarea` (wieloliniowe) w edytorze kafelka partnera w nagłówku, aby umożliwić wpisywanie tekstu z Enterem. Dodać `whitespace: pre-line` w rendererze, żeby nowe linie się wyświetlały.

## Zmiany

### 1. `HeaderSectionEditor.tsx`
- Import `Textarea` z `@/components/ui/textarea`
- Zamienić `<Input>` na `<Textarea>` dla pól „Tekst" i „Podtytuł" w sekcji kafelka partnera (linie 244 i 248)
- Dodać `className="min-h-[60px]"` żeby pola nie były za wysokie

### 2. `HeaderSection.tsx`
- Dodać `style={{ whiteSpace: 'pre-line' }}` na obu `<p>` renderujących tekst i podtytuł kafelka partnera (linie 90 i 93), żeby znaki nowej linii (`\n`) były renderowane jako łamanie wiersza

| Plik | Zmiana |
|------|--------|
| `HeaderSectionEditor.tsx` | Input → Textarea dla 2 pól kafelka |
| `HeaderSection.tsx` | Dodać `whiteSpace: pre-line` na 2 elementach `<p>` |

