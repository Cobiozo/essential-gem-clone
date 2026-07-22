## Cel
Poprawić komunikaty błędów w formularzu Bazy Wiedzy oraz ukryć dane gościa w widżecie OTP pod klikalny rozwijacz.

## Zmiany

### 1. Komunikaty błędów w `src/pages/HealthyKnowledgePublicPage.tsx`
- Zamiast surowego `error.message` (np. „Edge Function returned a non-2xx status code") pokazywać jednoznaczne komunikaty:
  - Brak/niepełne dane w formularzu → „Uzupełnij imię, nazwisko, e-mail i numer telefonu oraz zaznacz zgodę, aby uzyskać dostęp."
  - Kod nieprawidłowy / wygasły (401/404 z edge) → „Kod dostępu jest nieprawidłowy lub wygasł. Sprawdź kod i spróbuj ponownie."
  - Limit użyć (403) → „Limit użyć tego kodu został wyczerpany."
  - Inny błąd sieciowy → „Nie udało się połączyć z serwerem. Spróbuj ponownie za chwilę."
- Parsowanie odpowiedzi z `supabase.functions.invoke` (odczyt `context.response` / statusu) do zmapowania na powyższe komunikaty. Bez zmian w edge function — komunikaty budowane po stronie klienta.
- Ten sam komunikat inline (czerwony tekst pod polem kodu) i w toast.

### 2. Rozwijane dane gościa w widżetach OTP
Pliki:
- `src/components/dashboard/widgets/CombinedOtpCodesWidget.tsx`
- `src/components/healthy-knowledge/MyHkCodesHistory.tsx`

Zamiast od razu widocznego bloku z danymi gościa (imię, e-mail, telefon, „Oglądanie: Xs"), pokazać tylko przycisk/nagłówek typu:
```
▸ Pokaż dane osoby (1)
```
Kliknięcie rozwija sekcję z pełnymi danymi (lokalny stan `expandedCodeId` / `Set<string>`). Domyślnie zwinięte. Ikona chevronu obraca się przy rozwinięciu. Bez zmian danych pobieranych z bazy — tylko warstwa UI.

## Poza zakresem
- Brak zmian w edge functions, RLS ani w strukturze danych.
- Brak zmian w V1/V2 landing page ani w innych modułach.
