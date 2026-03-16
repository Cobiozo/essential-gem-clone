

# Analiza błędów konsoli

## Znalezione problemy

### 1. Ambiguous `module_id` w RPC `get_training_reminders_due` (BŁĄD — wpływa na CRON)

W logach edge function `process-pending-notifications` widać:
```
[CRON] Error fetching training reminders: { code: "42702", message: 'column reference "module_id" is ambiguous' }
```

Przyczyna: w funkcji SQL jest subquery:
```sql
SELECT COUNT(*) FROM training_lessons WHERE module_id = ta.module_id
```
`module_id` bez kwalifikatora tabeli jest niejednoznaczne (istnieje w `training_lessons` i w kontekście `training_assignments`). Trzeba zmienić na `WHERE training_lessons.module_id = ta.module_id`.

**Zmiana**: Migracja SQL — `ALTER FUNCTION` z poprawioną kwalifikacją kolumny.

### 2. Brakujące tłumaczenia i18n (OSTRZEŻENIA — nie crash)

5 brakujących kluczy w bazie `i18n_translations`:
- `teamContacts.eventRegistrations`
- `teamContacts.noRegistrations`
- `teamContacts.registeredFor`
- `teamContacts.meetings`
- `teamContacts.meeting`

Kod używa `tf()` z fallbackami, więc UI działa poprawnie — ale logi są zaśmiecone ostrzeżeniami.

**Zmiana**: Migracja SQL — INSERT do tabeli `i18n_translations` dla języka `pl`.

### 3. TikTok SDK — `plan_interacted` (ZEWNĘTRZNY — nie nasz kod)

Błąd: `RS SDK - TikTok Ads: Event name (plan_interacted) is not valid, must be mapped to one of standard events`

To jest zewnętrzny pixel TikTok Ads — nazwa eventu `plan_interacted` nie jest standardowym eventem TikTok. Wymaga konfiguracji w panelu TikTok Ads (mapowanie custom event na standard event). Nie dotyczy naszego kodu.

### 4. ERR_CONNECTION_CLOSED (ZEWNĘTRZNE)

Failing requests do `mpc-prod`, `google.com/ccm` — zewnętrzne trackery/analytics, nie nasz problem.

## Pętle i wycieki — brak

- `InviteToEventDialog`: useEffect ma poprawne zależności `[open, user]`, fetche uruchamiają się tylko przy otwarciu dialogu
- `ContactEventInfoButton`: useEffect zależy od `[contact.id]` — poprawne
- Brak nieskończonych pętli re-renderów

## Plan zmian

| Plik | Zmiana |
|------|--------|
| Nowa migracja SQL | 1) `CREATE OR REPLACE FUNCTION get_training_reminders_due` z poprawionym `module_id` 2) INSERT brakujących kluczy i18n |

