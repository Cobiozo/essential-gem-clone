# Push kodu projektu do GitHub `main` (bez nowych gałęzi)

## Cel

Wypchnąć pełny kod projektu (1965 plików, ~31 MB) z lokalnego `main` do GitHub repo `sebastiansnopek87-boop/purelifecenter`, gałąź `main`. Bez tworzenia nowych gałęzi. Bez PR-ów. Force-update `main` (bezpieczne — GitHub `main` ma tylko niepowiązany commit README).

## Dlaczego `git push` nie zadziała

- `$GITHUB_API_KEY` z connectora to klucz gateway, nie surowy token GitHub — nie działa bezpośrednio z `api.github.com` ani jako credential dla `git push`.
- Jedyna droga zapisu do GitHub to REST API przez `connector-gateway.lovable.dev/github/...` z `Authorization: Bearer $LOVABLE_API_KEY` i `X-Connection-Api-Key: $GITHUB_API_KEY`.

## Podejście: GitHub Git Data API

1. **Pobierz listę plików** z lokalnego `main` (`git ls-tree -r main`): ścieżka, tryb, SHA bloba, rozmiar.
2. **Klasyfikacja:** text (UTF-8) vs binary (jpg, png, mp3, lockb).
   - ~1926 plików tekstowych (tsx, ts, sql, json, md, html, css, svg, geojson…)
   - ~39 plików binarnych (24 jpg, 12 png, 2 mp3, 1 lockb)
3. **Tworzenie blobs** (wszystkie pliki, równolegle z concurrency ~20):
   - POST `/repos/{owner}/{repo}/git/blobs` z `content` (base64) i `encoding: "base64"`.
   - Dla plików tekstowych base64 jest bezpieczne; dla binarnych konieczne.
   - Zbierz `sha` każdego bloba.
   - Optymalizacja: pliki ≤ 100 bajtów mogą użyć inline content w tree bez osobnego bloba.
4. **Tworzenie drzewa** (batch 500 wpisów / wywołanie):
   - POST `/repos/{owner}/{repo}/git/trees` z `tree` = lista wpisów `{path, mode, type:"blob", sha}`.
   - GitHub automatycznie tworzy zagnieżdżone poddrzewa z pełnych ścieżek (np. `src/foo/bar.ts`).
   - ~4 wywołania dla 1965 plików.
   - Każde wywołanie zwraca `sha` drzewa; scalanie przez kolejne wywołanie z `base_tree`.
5. **Tworzenie commita**:
   - POST `/repos/{owner}/{repo}/git/commits` z `tree` = sha finalnego drzewa, `message` = "Initial project sync from Lovable".
   - Bez `parents` (root commit) — ponieważ historia GitHub (`6d23a1c7` README-only) jest niepowiązana z lokalną historią.
6. **Force-update ref `main`**:
   - PATCH `/repos/{owner}/{repo}/git/refs/heads/main` z `sha` = nowy commit, `force: true`.
   - Nadpisuje README-only historię pełnym kodem projektu.
7. **Weryfikacja**:
   - GET `/repos/.../branches` — `main` wskazuje nowy commit.
   - GET `/repos/.../contents/` — lista plików (sprawdzenie `package.json`, `src/`, `index.html`).
   - GET `/repos/...` — `size` > 0.

## Ograniczenia i ryzyka

- **Rate limit gateway:** 1965 wywołań tworzenia blobs. Przy concurrency 20 i ~300ms/wywołanie → ~30 s na batch, ~98 batchy → ~5 minut. Możliwe throttle od gateway. Plan: zacząć od concurrency 20, obniżyć jeśli 429.
- **Rozmiar payloadu tree:** 500 wpisów z samymi SHA = mały payload (~50 KB). Bezpieczne.
- **Duże pliki:** `countries-50m.geojson` 3 MB — blob API obsługuje do 100 MB. OK.
- **Gateway request size limit:** Nieznany. Jeśli pojedynczy blob >1 MB base64 (~1.3 MB) zostanie odrzucony, plan B: podział na mniejsze lub sprawdzenie limitu.
- **Timeout:** Skrypt Node.js z retry i progress logging. Timeout komendy 600 s; jeśli to za mało, podział na etapy (blob creation → tree → commit → ref).

## Skrypt

Jeden skrypt Node.js (`/tmp/github-push/push-to-main.mjs`) wykonujący całość:
- Czyta `git ls-tree -r main` przez `child_process`.
- Tworzy blobs równolegle (p-limit lub ręczna kolejka z concurrency).
- Tworzy drzewa w batchach 500.
- Tworzy commit, aktualizuje ref.
- Loguje postęp (blob X/1965, tree Y/4, commit, ref updated).
- Retry na 429/5xx (3 próby z backoff).

## Po pushu — dwukierunkowa synchronizacja (opcjonalnie, osobny krok)

Repo nie ma webhooków → dwukierunkowa synchronizacja Lovable GitHub App nie jest w pełni aktywna. Po wypchnięciu kodu:
- Sprawdzić, czy Lovable GitHub App jest zainstalowana z dostępem do repo (wymaga akcji użytkownika w GitHub Settings → Applications → Lovable → Configure → Repository access).
- Jeśli sync był ustawiony przez UI Lovable (Plus → GitHub → Connect), aktywacja powinna nastąpić po przyznaniu dostępu. To zapewni automatyczny push przyszłych zmian.
- Ten krok jest instrukcją dla użytkownika, nie wymaga zmian w kodzie projektu.

## Czego NIE robimy

- Nie tworzymy nowych gałęzi na GitHub (wszystko do `main`).
- Nie tworzymy PR.
- Nie zmieniamy package managera ani lockfile.
- Nie modyfikujemy kodu projektu — to czysta operacja git/API.
- Nie ruszamy wewnętrznego stanu git Lovable (`edit/...` branches, `origin`).
