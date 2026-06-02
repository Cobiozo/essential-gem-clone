## Co zostanie zrobione

Po zaakceptowanej migracji rozbuduję panel intro wideo o nowe opcje i podgląd.

### 1. Nowe pola w panelu `/admin?tab=intro-video`

**Moment wyświetlania** (`trigger_moment`):
- Po włączeniu strony (app_start) — obecne zachowanie
- Na stronie logowania (/auth)
- Przed zalogowaniem (niezalogowani na /auth)
- Po prawidłowym logowaniu
- Przy wejściu do dashboardu

**Częstotliwość** — rozszerzona o:
- Raz w tygodniu
- Raz na użytkownika (na zawsze)
- Przy każdym logowaniu

### 2. Podgląd „jak to będzie wyglądało"

Nowy przycisk **Podgląd** w panelu admina otwiera modal z:
- ramką wideo w proporcjach 16:9 odtwarzającą aktualnie wybrany plik,
- przyciskami sterującymi (mute, pomiń, odtwórz ponownie) dokładnie jak w realnym overlay,
- kafelkami podsumowującymi wybrany moment, częstotliwość, opóźnienie „Pomiń" i ustawienie dźwięku.

Podgląd działa offline od reszty appki — nie zapisuje stanu odtworzenia, można go uruchamiać ile razy potrzeba.

### 3. Logika overlay (`IntroVideoOverlay`)

- Respektuje `trigger_moment` — pokazuje się tylko w odpowiednim momencie (np. po `loginTrigger` z `AuthContext` dla „after_login", na `/dashboard*` dla „dashboard_entry").
- Rozpoznaje wszystkie nowe wartości `frequency` (tydzień ISO, klucz per user.id w localStorage, klucz per loginTrigger w sessionStorage).
- Zapobiega podwójnemu wyzwoleniu na tej samej ścieżce w jednym cyklu.

### 4. Czyszczenie

Usuwam z UI redundantny przełącznik „Pokazuj tylko na stronie logowania (/auth)" — zastąpiony opcją w polu „Moment wyświetlania". Kolumna w bazie zostaje (kompatybilność).

## Pliki

- `src/hooks/useIntroVideoSettings.ts` — typ rozszerzony o `frequency` i `trigger_moment`.
- `src/components/intro/IntroVideoOverlay.tsx` — nowa logika triggerów i częstotliwości.
- `src/components/admin/IntroVideoSettingsPanel.tsx` — nowe selecty, usunięty stary toggle, przycisk Podgląd.
- `src/components/admin/IntroVideoPreviewDialog.tsx` (nowy) — modal podglądu z ramką wideo i podsumowaniem ustawień.

Brak zmian w bazie (migracja już zatwierdzona) i brak zmian w `App.tsx`.