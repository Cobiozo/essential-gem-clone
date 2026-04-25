## Cel

Rozszerzyć system widoczności modułu „Płatne wydarzenia" o nadpisania per-użytkownik. Admin chce możliwość:

- Włączyć moduł dla całej roli (np. Partnerzy), ale **wykluczyć** konkretnego partnera.
- Wyłączyć moduł dla całej roli, ale **dodać dostęp** konkretnemu użytkownikowi (niezależnie od jego roli).

Dotychczasowe przełączniki ról (Admin / Partner / Specjalista / Klient) pozostają. Dochodzi warstwa wyjątków per-użytkownik.

## Logika widoczności (priorytety)

Dla danego użytkownika kolejność decyzji:

1. **Override = denied** dla tego user_id → moduł UKRYTY (nawet jeśli rola ma włączone).
2. **Override = allowed** dla tego user_id → moduł WIDOCZNY (nawet jeśli rola ma wyłączone, i nawet jeśli `is_enabled=false` na poziomie roli — admin świadomie dał dostęp).
3. **Brak overrida** → standardowa logika `visible_to_<role>` z `paid_events_settings`.

Admini (rola admin) zawsze widzą moduł — bez zmian.

## Zmiany w bazie

Nowa tabela `paid_events_visibility_overrides`:

```text
id            uuid PK
user_id       uuid → auth.users(id) on delete cascade
mode          text check in ('allowed','denied')
created_at    timestamptz default now()
created_by    uuid → auth.users(id)
note          text nullable     -- opcjonalna notatka admina
unique(user_id)                 -- jeden wpis per user
```

RLS:
- SELECT/INSERT/UPDATE/DELETE: tylko `has_role(auth.uid(), 'admin')`.
- Dodatkowo SELECT dla samego użytkownika na własnym wpisie (potrzebne by frontend mógł zbudować swój stan widoczności bez edge function).

Indeks na `user_id`.

## Zmiany w hooku widoczności

`src/hooks/usePaidEventsVisibility.ts`:

- Dodaje równoległe pobieranie overrida dla bieżącego użytkownika (`paid_events_visibility_overrides` where `user_id = auth.uid()`).
- Nowa funkcja `useIsPaidEventsVisible()` zwracająca pojedynczy boolean wg priorytetów wyżej.
- Stara funkcja `isRoleVisibleForPaidEvents` pozostaje dla zgodności wstecznej, ale `DashboardSidebar` zostaje przepięty na `useIsPaidEventsVisible()`.

## Zmiany w UI ustawień

`src/components/admin/paid-events/PaidEventsSettings.tsx` — nowa karta „Wyjątki per użytkownik" pod kartą „Widoczność modułu":

- Wyszukiwarka użytkowników (po imieniu, nazwisku, e-mailu, EQID) — re-używamy istniejącego wzorca z innych paneli admina.
- Przycisk „Dodaj wyjątek" → modal: wybór użytkownika + tryb (Zezwól / Zablokuj) + opcjonalna notatka.
- Lista bieżących wyjątków: avatar/imię/nazwisko, e-mail, rola, badge trybu (zielony „Zezwolono" / czerwony „Zablokowano"), notatka, przycisk usuń.
- Filtr/przełącznik „Pokaż tylko zablokowanych / zezwolonych / wszystkich".

UX:
- Krótka legenda: „Wyjątek nadpisuje ustawienia roli. Zezwól = użytkownik widzi moduł niezależnie od swojej roli. Zablokuj = użytkownik nie widzi modułu, nawet jeśli jego rola ma dostęp."
- Walidacja: nie można dodać wyjątku dla samego siebie (admin) — i tak by nic nie zmieniło.

## Pliki do zmiany / utworzenia

- migracja SQL: tabela `paid_events_visibility_overrides` + RLS + indeks
- `src/hooks/usePaidEventsVisibility.ts` — rozszerzenie o overrida i `useIsPaidEventsVisible`
- `src/components/dashboard/DashboardSidebar.tsx` — użycie nowego hooka
- `src/components/admin/paid-events/PaidEventsSettings.tsx` — montuje nową kartę
- nowy `src/components/admin/paid-events/PaidEventsUserOverrides.tsx` — UI listy + modal dodawania
- nowy `src/components/admin/paid-events/AddPaidEventsOverrideDialog.tsx` — wyszukiwarka użytkownika + tryb + notatka

## Poza zakresem

- Brak grupowych nadpisań (np. cały zespół lidera) — tylko per-user.
- Brak czasowych wygasań (TTL) — wyjątek obowiązuje do ręcznego usunięcia.
