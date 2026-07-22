## Odpowiedź: TAK, da się to zrobić bezpiecznie

Strona dla niezalogowanych to obecnie komponent `<Index />` renderowany tylko na trasie `/` gdy `user === null` (App.tsx linia 404–407). Cała reszta aplikacji (dashboard, /auth, panele, wydarzenia, akademia itd.) jest kompletnie odseparowana — zmiana strony powitalnej nie dotyka żadnego innego widoku, żadnej logiki logowania ani żadnego API. Ryzyko naruszenia innych elementów: praktycznie zerowe, o ile trzymamy zmiany wyłącznie w nowym komponencie landingu, nowej tabeli konfiguracji i przełączniku w panelu admina.

Dodatkowo: architektura CMS w projekcie (`cms_sections` + `cms_items` z `page_id`, patrz core memory) jest dokładnie tym samym wzorcem, którego użyjemy — to sprawdzone rozwiązanie w tym projekcie.

---

## Co zbudujemy

### 1. Nowa strona główna (Landing V2) zgodna z makietą
Zbudowana 1:1 wg wgranego obrazka (Pure Life Center, hero „Zdrowie. Wiedza. Więcej życia.”, sekcja „Co zyskujesz?” z 5 ikonami, pasek statystyk 1200+/350+/40+/24/7, sekcja „Dołącz do ludzi…” z wideo, pasek „Zaufali nam” z logotypami). Zero hardkodowanych kolorów — wyłącznie tokeny z `index.css` (złoty akcent staje się nowym tokenem `--brand-gold`).

### 2. Pełna edytowalność w panelu admina
Każdy element edytowalny osobno (bez „ściany JSON-a”):
- **Hero:** eyebrow, 3 linie nagłówka (z osobną kolorystyką akcentu na „Więcej życia.”), akapit opisu, tekst + link CTA głównego, tekst + link CTA wtórnego (▶ Zobacz jak działa), avatary społeczności (upload + kolejność), tekst pod avatarami, obraz „mockup” po prawej (upload).
- **Sekcja „Co zyskujesz?”:** eyebrow, nagłówek, lista kart (add/remove/reorder drag&drop). Każda karta: ikona (picker z lucide-react), tytuł, opis.
- **Pasek statystyk:** lista pozycji (add/remove/reorder). Każda: ikona, liczba, podpis.
- **Sekcja „Dołącz do ludzi…”:** eyebrow, nagłówek, lista bulletów (add/remove/reorder), tekst + link CTA, obraz tła + tekst nakładki, URL wideo, avatary + licznik osób.
- **Zaufali nam:** lista logo (upload + alt + link + kolejność).
- **SEO / meta:** title, description, og:image dla `/`.

Wszystko z auto-save (wzorzec `GenericEditor`), live preview w iframie `/` z parametrem `?preview=draft`, wersja robocza vs opublikowana.

### 3. Wybór aktywnej strony głównej (V1 aktualna / V2 nowa)
W panelu admina „Ustawienia → Strona główna” prosty przełącznik:
- **Wariant A:** obecna strona (`<Index />`) — bez zmian.
- **Wariant B:** nowa edytowalna (`<LandingV2 />`).
Admin może w każdej chwili przełączyć, bez deployu. Możliwość podglądu wariantu nieaktywnego przez `?variant=v2` (tylko dla adminów).

### 4. Bezpieczeństwo zakresu zmian
- Nie ruszamy `<Index />`, `<Auth />`, `<Dashboard />` ani żadnej innej trasy.
- Nie ruszamy logiki auth/redirectów — warunek `user ? Navigate : <Landing/>` zostaje.
- Nowe pliki + jedna nowa tabela + jeden nowy endpoint konfiguracji. Rollback = przełącznik z powrotem na V1.

---

## Sekcja techniczna

**Frontend**
- `src/pages/LandingV2.tsx` — nowy komponent renderujący sekcje z konfiguracji.
- `src/components/landing-v2/sections/*` — `HeroSection`, `FeaturesSection`, `StatsSection`, `CommunitySection`, `TrustedBySection` (każda czyta swój blok configu).
- `src/hooks/useHomepageConfig.ts` — pobiera aktywny wariant + treść, cache przez React Query, realtime subscribe.
- `src/App.tsx` — jedna linia: `user ? Navigate : <HomepageSwitcher />`, gdzie `HomepageSwitcher` czyta flagę i renderuje `<Index />` albo `<LandingV2 />`. Zero zmian w innych trasach.

**Panel admina**
- `src/pages/admin/HomepageEditor.tsx` — zakładki per sekcja + globalny toggle wariantu.
- Reużycie istniejących primitives: `MediaUpload`, `IconPicker` (nowy, wrapper na lucide-react), `RichTextEditor`, `SortableList`.
- Autoryzacja: tylko `has_role(auth.uid(),'admin')`.

**Baza danych (nowa, izolowana)**
- `public.homepage_settings` — jeden wiersz, kolumna `active_variant text check in ('v1','v2')`, `updated_at`, `updated_by`.
- `public.homepage_v2_content` — jeden wiersz JSONB `content` (struktura sekcji), `draft_content` JSONB, `published_at`, `updated_by`.
- Grants: `SELECT` dla `anon` + `authenticated` (strona publiczna), `UPDATE/INSERT` tylko przez edge function z sprawdzeniem admina — zgodnie z governance projektu.
- RLS: read = public, write = `has_role(auth.uid(),'admin')`.
- Realtime enabled dla podglądu na żywo.

**Edge function**
- `save-homepage-content` — waliduje admina JWT, zapisuje draft/publish (analogicznie do `save-cms-layout`).

**Media / uploady**
- Obrazy hero/mockup/logotypy/avatary: istniejący pipeline VPS XHR (>2MB) + fallback Supabase, bucket `cms-images`.

**SEO**
- `useDynamicMetaTags` (istnieje) czyta z `homepage_settings`.

**Migracja treści**
- Seed `homepage_v2_content` domyślnymi wartościami dokładnie odwzorowującymi wgraną makietę, żeby po włączeniu V2 wyglądała 1:1 od pierwszej sekundy.

**Zakres NIE-zmian (gwarancja izolacji)**
- `src/pages/Index.tsx` — nietknięty.
- Auth, dashboard, role, RLS profili, CMS istniejący (`cms_sections`/`cms_items`), i18n, webinary, akademia, CRM — nietknięte.
- Jedyny styk z resztą aplikacji: jedna linia w `App.tsx` + jeden link w menu admina.

---

## Plan wdrożenia (kolejność)

1. Migracja SQL: `homepage_settings` + `homepage_v2_content` + grants + RLS + seed V1 jako aktywny.
2. `LandingV2` + sekcje + tokeny kolorów (złoty akcent) w `index.css`.
3. `HomepageSwitcher` w `App.tsx` (1 linia zmiany).
4. Edge function `save-homepage-content`.
5. Panel admina `HomepageEditor` z auto-save i live preview.
6. Seed treści z makiety, weryfikacja wizualna 1:1.
7. Test przełącznika V1↔V2 + test niezalogowany/zalogowany + test podglądu admina.

Po akceptacji planu przechodzę do realizacji.