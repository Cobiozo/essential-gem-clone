## Cel
Ukryć przełącznik układu siatki (`GridLayoutSwitcher`) na `/aktualnosci` dla wszystkich oprócz admina. Zwykły użytkownik widzi zawsze układ ustawiony przez admina.

## Zmiana
`src/pages/NewsHubPage.tsx`:
- Cały blok `<div className="ml-auto flex items-center gap-2">…</div>` (switcher + przycisk „Resetuj") renderujemy tylko gdy `isAdmin`.
- Do `BentoGrid` przekazujemy `adminLayout` zamiast `effectiveLayout` dla nie-adminów, czyli prosto: `layout={isAdmin ? effectiveLayout : adminLayout}`.
- Usuwamy zapis lokalnego `userLayout` dla nie-adminów (nie ma jak go zmienić, więc nic dodatkowego — po prostu nie ma UI).

Nic więcej nie zmieniam: admin nadal może w `/admin/news-hub` ustawić domyślny układ, a sam może na froncie przełączać dla podglądu.
