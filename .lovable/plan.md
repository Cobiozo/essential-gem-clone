

## Poprawki: wolniejsza animacja + naprawienie linkow PubMed

### Zmiana 1: Bardzo wolna animacja ikony

Obecna animacja trwa 6 sekund -- to wciaz za szybko. Zmiana na **20 sekund** z minimalnymi ruchami:

**Plik: `tailwind.config.ts`** (linia 262)
- Duration: `6s` -> `20s`
- Zmniejszenie amplitudy skokow: `translateY(-4px)` -> `translateY(-2px)`, `translateY(-2px)` -> `translateY(-1px)`
- Zmniejszenie skali: `scale(1.08)` -> `scale(1.03)`
- Delikatniejsze cienie

### Zmiana 2: Naprawienie linkow PubMed

Blad `ERR_BLOCKED_BY_RESPONSE` na screenie to blokada PubMed przez przegladarke (naglowki CORS/X-Frame-Options). Dzieje sie to w srodowisku podgladu Lovable -- w opublikowanej wersji (purelife.lovable.app) powinno dzialac.

Jednak aby poprawic doswiadczenie, dodam `onClick` handler z `window.open()` na wszystkich linkach w odpowiedziach. To obejdzie ograniczenia iframe podgladu.

**Plik: `src/pages/OmegaBasePage.tsx`** (linie 399-404 i 431-436)
- Dodanie `onClick={(e) => { e.preventDefault(); window.open(url, '_blank', 'noopener,noreferrer'); }}` do obu typow linkow (markdown i bare URL)

### Podsumowanie zmian

| Plik | Zmiana |
|------|--------|
| `tailwind.config.ts` | Animacja `omega-pulse-bounce`: 20s, mniejsze skoki i skala |
| `src/pages/OmegaBasePage.tsx` | Dodanie `onClick` + `window.open()` na linkach |

