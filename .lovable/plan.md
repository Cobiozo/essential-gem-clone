## Co znalazłem

- Akademia w konfiguracji dolnego paska jest już zapisana jako `/training`.
- Trasa `/training` istnieje w `App.tsx`, więc sama ścieżka jest poprawna.
- W bazie nadal są też stare/błędne pozycje (`/profile`, dawny Eventy, duplikat Nowa pozycja), co może mylić testowanie.
- Dolny pasek używa `navigate(targetPath)`, ale nie czyści query stringów ani nie wymusza twardego fallbacku, więc w niektórych stanach aplikacji/mobile/PWA klik może wyglądać jak „nic się nie stało”.

## Plan naprawy

1. **Uodpornić kliknięcie w dolnym pasku**
   - Dodać centralną funkcję obsługi celu nawigacji.
   - Dla ścieżek aplikacji typu `/training` wykonywać bezpieczne przejście z pełnym `pathname + search + hash`.
   - Jeśli użytkownik kliknie aktualnie tę samą ścieżkę, przewinąć stronę do góry zamiast pozostawiać brak reakcji.
   - Dodać fallback `window.location.assign(...)` dla sytuacji, gdy SPA navigation nie zmieni widoku.

2. **Poprawić obsługę adresów z parametrami**
   - Nie obcinać `?tab=...` przy kliknięciu.
   - Poprawnie obsługiwać `#sekcja` po wejściu na stronę.
   - Aktywność przycisku liczyć po `pathname`, ale nawigację wykonywać pełnym adresem.

3. **Naprawić problem starych/błędnych pozycji w bazie**
   - Zmienić `/profile` na `/my-account?tab=profile`.
   - Wyłączyć albo zostawić bez wpływu stare pozycje testowe/duplikaty, żeby nie przeszkadzały w mobile.
   - Upewnić się, że „Akademia” ma `target_path = '/training'`, aktywność włączoną i widoczność dla ról.

4. **Poprawić panel admina, żeby problem nie wracał**
   - Przy wyborze z katalogu zawsze zapisywać dokładną ścieżkę z rejestru.
   - Dodać walidację ścieżki własnej: musi zaczynać się od `/`; przy błędnych znanych aliasach pokazać/ustawić właściwy odpowiednik.

5. **Weryfikacja**
   - Po zmianach sprawdzić w mobile viewport, że kliknięcie „Akademia” prowadzi do `/training` i renderuje stronę Akademii.
   - Sprawdzić także, że „Profil” nie prowadzi już do nieistniejącego `/profile`.

## Pliki do zmiany

- `src/components/layout/MobileBottomNav.tsx`
- `src/components/admin/MobileNavPathPicker.tsx`
- `src/components/admin/MobileBottomNavSettings.tsx` — tylko jeśli potrzebna będzie walidacja/komunikat
- migracja Supabase aktualizująca błędne rekordy w `mobile_bottom_nav_items`
