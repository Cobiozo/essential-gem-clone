# Naprawa dodawania wideo w Aktualnościach

## Problem

Plik wideo faktycznie wgrywa się na serwer plików, ale zaraz po uploadzie Aktualności robią własną kontrolę pliku i przy pierwszym niepowodzeniu sieciowym odrzucają cały upload komunikatem „Nie można zweryfikować wgranego pliku wideo (brak dostępu sieciowego do serwera plików)”. URL nigdy nie trafia do pola „URL pliku”, więc blok wideo zostaje pusty („Brak URL wideo”).

Powód: moduł Aktualności sprawdza wyłącznie pełny adres zwrócony przez serwer (inna domena → blokada przeglądarki/CORS), robi tylko jedną próbę i całkowicie ignoruje potwierdzenie zapisu wysyłane przez serwer. Akademia ma już poprawną, odporną wersję tej samej kontroli i tam wideo działa.

## Rozwiązanie

Ujednolicić weryfikację w Aktualnościach z tą z Akademii:

1. Używać ścieżki względnej `/uploads/...` (ten sam adres co aplikacja) jako pierwszego kandydata do sprawdzenia, a pełnego URL-a jako zapasowego.
2. Wykonywać 3 próby z krótkimi przerwami (~0.9 s, 1.8 s) — serwer bywa gotowy chwilę po zapisie.
3. Jeśli serwer potwierdził zapis pliku, a sprawdzenie sieciowe nie doszło do skutku: zapisać URL i pokazać tylko ostrzeżenie („plik zapisany, odtwarzanie może być dostępne za chwilę”) zamiast blokować dodanie wideo.
4. Twardy błąd zostawić wyłącznie dla realnie złych odpowiedzi (404, HTML zamiast pliku, zły typ zawartości przy udanym połączeniu).
5. Preferować w zapisanym poście adres względny, żeby odtwarzanie działało niezależnie od domeny.

## Szczegóły techniczne

- `src/hooks/useNewsHub.ts`:
  - `uploadWithMulter` zwraca obiekt `{ url, relativePath, publicUrl, serverVerified }` zamiast samego `data.url` (odczyt `data.relativePath`, `data.publicUrl`, `data.verified`), z helperem `getUploadRelativePath` jak w `useLocalStorage.ts`.
  - `verifyUploadedUrl` → przyjmuje listę kandydatów, 3 próby z `sleep`, zwraca `null` przy pierwszym sukcesie.
  - `uploadNewsHubFile` dla wideo: przy błędzie weryfikacji, gdy `serverVerified === true`, zwraca URL i loguje ostrzeżenie (opcjonalny callback `onWarning`), w przeciwnym razie rzuca błąd.
  - Ta sama, łagodniejsza ścieżka dla dużych plików nie-wideo.
- Komunikat ostrzegawczy w edytorze Aktualności pokazywany jako toast informacyjny, nie błąd.

Bez zmian w bazie danych i bez zmian po stronie serwera plików.
