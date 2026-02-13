
# Plan: Automatyczne czyszczenie starych certyfikatów (starszych niż 1 miesiąc)

## Problem
Bucket `certificates` zawiera 1260 MB plików PDF, co stanowi 66% całego storage i powoduje przekroczenie limitów. Certyfikaty nigdy nie są czyszczone. Potrzebny jest automatyczny mechanizm do usuwania starych plików.

## Rozwiązanie

### 1. Nowa Edge Function: `cleanup-old-certificates`
Lokalizacja: `supabase/functions/cleanup-old-certificates/index.ts`

Funkcjonalność:
- Pobiera wszystkie obiekty z bucketu `certificates` przy użyciu SQL query na `storage.objects`
- Filtruje pliki ze względu na `created_at < teraz - 30 dni`
- Usuwa znalezione pliki w partiach po 100
- Loguje wyniki (ile plików usunięto, błędy)
- Zwraca raport JSON

Struktura:
- Korzysta z `SUPABASE_SERVICE_ROLE_KEY` (admin access)
- Query na `storage.objects` zamiast list API (bardziej efektywne dla dużej liczby plików)
- Obsługuje cross-origin i CORS
- `verify_jwt = false` w config.toml (uruchamiana scheduled, bez user context)

### 2. Konfiguracja w `supabase/config.toml`
Dodać nową sekcję funkcji (około linia 174, w kolejności alfabetycznej):
```toml
[functions.cleanup-old-certificates]
verify_jwt = false
```

### 3. Zaplanowany job (Scheduled Cleanup)
Po deploymencie edge function, użytkownik będzie mógł:
- Ręcznie wyzwolić funkcję poprzez przycisk w adminpanelu
- LUB wykorzystać SQL cron job w Supabase (pg_cron) do automatycznego uruchamiania codziennie o północy

**SQL cron job** (opcjonalnie, jeśli Supabase ma pg_cron włączony):
```sql
select cron.schedule(
  'cleanup-old-certificates-daily',
  '0 0 * * *', -- codziennie o 00:00 UTC
  $$
  select net.http_post(
    url:='https://xzlhssqqbajqhnsmbucf.supabase.co/functions/v1/cleanup-old-certificates',
    headers:='{"Authorization": "Bearer <ANON_KEY>"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);
```

## Przychód
- **Przed**: 1260 MB w bucket `certificates`
- **Po 30 dni**: Wszystkie certyfikaty sprzed 1 miesiąca zostaną automatycznie usunięte
- **Oszczędność**: Szacunkowo 200-400 MB w zależności od liczby wygenerowanych certyfikatów w ciągu miesiąca
- **Wynik**: Projekt będzie działać poniżej limitów storage

## Zmiany
- **1 plik**: Nowa edge function `supabase/functions/cleanup-old-certificates/index.ts`
- **1 plik**: Aktualizacja `supabase/config.toml` (dodanie konfiguracji funkcji)
- **Opcjonalnie**: Setup SQL cron job (wymaga `pg_cron` w Supabase)

## Brak zmian
- Baza danych — żadne nowe tabele
- Frontend — brak zmian w UI
