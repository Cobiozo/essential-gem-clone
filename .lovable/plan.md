# Uproszczenie paska filtrów /aktualnosci

## Cel
Zamiast rzędów chipów (kategorie + typy) — kompaktowe rozwijane selecty, jak na załączonym screenie referencyjnym ("Sortuj", "Wybierz rok", "Wybierz kategorię").

## Zmiany — `src/pages/NewsHubPage.tsx`

Obecny pasek (~ linie 75–135) zawiera: pole szukania, rząd chipów kategorii, rząd chipów typów, przełącznik układu, przycisk Resetuj.

Nowy layout — jedna linia (na md+), wrap na mobile:

1. **Pole szukania** — pozostaje (kompaktowe, `max-w-xs`).
2. **Sortuj** — nowy `<Select>` (shadcn) z opcjami:
   - Od najnowszych (domyślnie)
   - Od najstarszych
   - Najpierw przypięte (obecne zachowanie)
3. **Rok** — nowy `<Select>`: „Wszystkie" + lata zebrane z `posts[].created_at` (unikalne, malejąco).
4. **Kategoria** — `<Select>`: „Wszystkie kategorie" + lista `categories`. Kolorowa kropka obok nazwy.
5. **Typ** — `<Select>`: opcje z `TYPE_TABS` (Wszystko / Ogłoszenie / Artykuł / Wideo / Galeria / Plik / Link).
6. **Układ siatki** — pozostawiam `GridLayoutSwitcher` (ikony) po prawej stronie, oraz „Resetuj" tylko gdy `userLayout` różni się od `adminLayout`. Te są wizualne i nie zaśmiecają.

## Logika filtrowania
- Dodaję `sortMode` state ('newest' | 'oldest' | 'pinned-first', default `'pinned-first'` żeby zachować obecne UX).
- Dodaję `year` state (`'all' | string`).
- `useMemo` filtruje `posts` po `year`, sortuje wg `sortMode`. Sekcja pinned wyświetlana tylko gdy `sortMode === 'pinned-first'`.

## Styl
- Wszystkie selecty: `h-9`, jednolita szerokość (~`w-[180px]`), label nad selectem opcjonalny — preferuję sam placeholder dla zwięzłości (np. „Sortuj", „Rok", „Kategoria", „Typ").
- Wrap-friendly: `flex flex-wrap gap-2 items-center`.

## Co NIE zmieniam
- Nagłówek „Centrum Aktualności" i hint dla admina.
- Logika `useNewsHubPosts`, kategorie, typy postów.
- Widok admin `/admin/news-hub` — to osobny ekran z innym paskiem.

## Pliki
- `src/pages/NewsHubPage.tsx` — przebudowa paska filtrów + dodanie sort/year state i memo.
