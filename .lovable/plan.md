

# Plan: Naprawa samouczka + per-event język zaproszenia

## Problem 1: Samouczek — złe wskazywanie i powtórzenia

**Diagnoza ze screena:** Krok 19/30 "Zdrowa Wiedza (widget)" podświetla "Pulpit" w sidebarze zamiast widgetu na dashboardzie. Widget jest poza widokiem, a scroll nie działa poprawnie lub element nie jest widoczny w momencie namierzania.

**Powtórzenia treści w krokach:**
- `healthy-knowledge-widget` (widget na dashboardzie) — opis prawie identyczny jak...
- `zdrowa-wiedza` / `menu-healthy-knowledge` (element w sidebar) — ten sam temat "Zdrowa Wiedza"
- Podobnie: `reflinks-widget` vs `pure-linki`, `infolinks-widget` vs `info-linki`, `training-widget` vs `training` (akademia)

**Zmiany w `src/components/onboarding/tourSteps.ts`:**
- Usunąć duplikujące się kroki widgetów, które mają swoje odpowiedniki w sekcji menu bocznego. Zostawić kroki menu bocznego (bardziej stabilne selektory) i połączyć opisy — np. "Zdrowa Wiedza" w menu sidebar wspomni o widgecie na dashboardzie
- Widgety do usunięcia: `healthy-knowledge-widget`, `infolinks-widget`, `reflinks-widget` — ich treść przenieść do odpowiednich kroków w sekcji menu
- Widgety unikalne (bez odpowiednika w menu): `welcome-widget`, `news-ticker`, `calendar`, `my-meetings-widget`, `training-widget`, `otp-codes-widget`, `resources-widget`, `team-contacts-widget` — te zostają

**Zmiany w `src/components/onboarding/TourOverlay.tsx`:**
- Dodać zabezpieczenie: jeśli element nie został znaleziony po retries, zamiast `onNext()` automatycznie, pokazać tooltip bez podświetlenia (fallback centralny) z informacją że element nie jest widoczny — lub po prostu pominąć krok bez błędu (obecne zachowanie, ale upewnić się że `onNext` nie wchodzi w pętlę)

**Efekt:** Redukcja z ~30 do ~25 kroków dla partnera, brak powtórzeń treści, stabilniejsze targetowanie.

## Problem 2: Flaga języka zaproszenia zmienia język dla wszystkich spotkań

**Diagnoza:** W `MyMeetingsWidget.tsx` jest jeden `useState` — `const [inviteLang, setInviteLang] = useState('pl')` — współdzielony przez wszystkie spotkania na liście.

**Zmiana w `src/components/dashboard/widgets/MyMeetingsWidget.tsx`:**
- Zamienić `inviteLang: string` na `inviteLangs: Record<string, string>` — klucz to `event.id`, wartość to wybrany język
- Getter: `inviteLangs[event.id] || 'pl'`
- Setter: `setInviteLangs(prev => ({ ...prev, [event.id]: lang }))`
- Dostosować `handleCopyInvitation` aby brać język z `inviteLangs[event.id]`

## Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `src/components/onboarding/tourSteps.ts` | Usunięcie 3 zduplikowanych kroków widgetów, wzbogacenie opisów kroków menu |
| `src/components/dashboard/widgets/MyMeetingsWidget.tsx` | Per-event `inviteLang` zamiast globalnego |

