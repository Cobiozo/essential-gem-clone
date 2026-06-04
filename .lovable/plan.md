## Plan naprawy

### 1. Naprawię wyszukiwanie i wybór moderatorów
- Obecny kod szuka kolumny `full_name`, której w tabeli `profiles` nie ma — są `first_name`, `last_name`, `email`, `eq_id`, `id`, `user_id`.
- Zmienię wyszukiwarkę moderatorów tak, aby działała po:
  - imieniu,
  - nazwisku,
  - pełnym imieniu i nazwisku złożonym z `first_name + last_name`,
  - EQ ID,
  - e-mailu.
- Poprawię dodawanie moderatora tak, aby jako identyfikator roli używało `profiles.user_id`, a nie `profiles.id`, bo `user_roles` i `moderator_permissions` są powiązane z auth user ID.
- Poprawię listę już nadanych moderatorów, żeby poprawnie pokazywała dane użytkownika.

### 2. Uszczelnię nadawanie uprawnień moderatora
- Zostawię zapis uprawnień przez Edge Function `admin-set-moderator`, żeby frontend nie musiał bezpośrednio omijać RLS.
- Dodam lepszy komunikat błędu, gdy funkcja nie jest dostępna albo administrator nie ma sesji.
- Sprawdzę, czy po nadaniu uprawnień moderator będzie widział tylko dozwolone moduły w Panelu CMS.

### 3. Naprawię upload wideo w artykule „Podsumowanie miesiąca MAJ”
- Błąd ze screena oznacza, że plik fizycznie trafia do endpointu uploadu, ale potem serwer nie udostępnia go pod zwróconym URL-em.
- Zmienię upload News Hub tak, żeby dla dużych plików MP4 używał tego samego stabilnego folderu VPS co działające materiały wideo (`training-media`) zamiast nowych folderów `news-hub-media`, które nie są obsługiwane przez produkcyjny serwer.
- Zachowam walidację po uploadzie, ale poprawię ją tak, żeby nie blokowała prawidłowych odpowiedzi, a blokowała tylko realny fallback HTML.
- W edytorze bloku wideo zostawię automatyczne wpisanie URL do pola po uploadzie, żeby blok natychmiast pojawiał się w podglądzie.

### 4. Uporządkuję istniejący post
- Post „Podsumowanie miesiąca MAJ” ma teraz `media_url = null`, a blok wideo nie ma URL — dlatego widać „Brak URL wideo”.
- Po naprawie kodu trzeba będzie ponownie wgrać plik MP4 w tym poście. Aplikacja powinna wtedy zapisać poprawny adres i odtworzyć metadane zamiast 0:00.

### 5. Walidacja po zmianach
- Sprawdzę zapytaniami bazę pod kątem kolumn profilu i aktualnego wpisu posta.
- Zweryfikuję, że kod wyszukiwarki moderatorów używa poprawnych pól.
- Zweryfikuję, że upload dla dużego MP4 generuje URL w ścieżce obsługiwanej przez VPS i że edytor nie zostawia pustego `url` w bloku wideo.

## Pliki do zmiany
- `src/components/admin/ModeratorsManagement.tsx`
- `src/hooks/useNewsHub.ts`
- ewentualnie `src/components/news-hub/editor/BlockListEditor.tsx`, jeśli trzeba doprecyzować obsługę pola URL po uploadzie

## Bez zmian w bazie
Nie planuję nowej migracji, bo problem moderatorów wynika głównie z błędnych nazw pól i użycia złego ID profilu, a problem wideo z nieobsługiwanego folderu na VPS.