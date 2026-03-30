

## Redesign PWA Install Banner — styl jak na screenshocie (EQApp)

Na screenie widać dwa elementy:
1. **Górny dialog** (natywny Chrome install prompt) — tego nie kontrolujemy wizualnie, to przeglądarka go wyświetla po wywołaniu `beforeinstallprompt.prompt()`. Już to obsługujemy.
2. **Dolny baner** — elegancki, przypięty do dołu ekranu, z ikoną aplikacji, tekstem i przyciskami "Zainstaluj" / "X".

Aktualny baner jest przypięty do **góry** strony i wygląda jak alert. Zmienimy go na profesjonalny **dolny baner** wzorowany na screenie.

---

### Zmiany

**Plik: `src/components/pwa/PWAInstallBanner.tsx`** — przeprojektowanie całego komponentu:

- **Pozycja**: `fixed bottom-0 left-0 right-0` zamiast `fixed top-2` — baner na dole ekranu, pełna szerokość
- **Layout**: Poziomy pasek z:
  - Ikona aplikacji (logo Pure Life, `pwa-192.png`) po lewej — zaokrąglony kwadrat
  - Tekst: "Zainstaluj Pure Life Center" + podpis "Szybszy dostęp i powiadomienia push"
  - Przycisk "Zainstaluj" (primary, zielony) po prawej
  - Przycisk X (zamknij) obok
- **Styl**: Biały/jasny tło, delikatny cień do góry (`shadow-[0_-2px_10px_rgba(0,0,0,0.1)]`), border-top
- **Uproszczona logika**: Jeden uniwersalny wygląd banera dla wszystkich platform — klik "Zainstaluj" wywołuje `promptInstall()` (jeśli `canInstall`), a na iOS/Safari otwiera `/install` z instrukcjami
- **Mobile**: Na mobilnych pełna szerokość z `safe-area-inset-bottom` padding
- **Desktop**: Baner na dole, max-width ograniczone, wycentrowane lub dopasowane do layoutu

Szczegółowe instrukcje platform (Safari share, Chrome menu, Edge itp.) pozostaną na stronie `/install`. Baner będzie prosty i czysty — jedno CTA.

### Szczegóły techniczne

```text
┌─────────────────────────────────────────────────────┐
│  [logo]  Zainstaluj Pure Life Center        [X]     │
│          Szybszy dostęp i powiadomienia   [Zainstaluj]│
└─────────────────────────────────────────────────────┘
```

- Logo: `/pwa-192.png` — 40x40px, rounded-xl
- Gdy `canInstall` = true → przycisk wywołuje natywny prompt
- Gdy `canInstall` = false (iOS/Safari/Firefox) → przycisk linkuje do `/install`
- Zachowujemy dismiss logic (14 dni), `resetPWAInstallBanner` event, warunki ukrycia

