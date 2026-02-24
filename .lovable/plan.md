
## Naprawa usuwania użytkownika -- blokada przez foreign key constraints

### Problem

Usuwanie użytkownika z panelu administratora kończy się błędem:
```
"update or delete on table "users" violates foreign key constraint "events_created_by_fkey" on table "events""
```

Edge function `admin-delete-user` wywołuje `supabaseAdmin.auth.admin.deleteUser(userId)`, co próbuje usunąć wiersz z `auth.users`. Jednak 17 tabel posiada foreign key do `auth.users` BEZ kaskadowego usuwania (domyślnie `NO ACTION`), co blokuje operację.

### Dotknięte tabele i kolumny

| Tabela | Constraint | Kolumna | Obecna reguła |
|--------|-----------|---------|---------------|
| events | events_created_by_fkey | created_by | NO ACTION |
| events | events_host_user_id_fkey | host_user_id | NO ACTION |
| certificates | certificates_issued_by_fkey | issued_by | NO ACTION |
| admin_alerts | admin_alerts_resolved_by_fkey | resolved_by | NO ACTION |
| calculator_user_access | calculator_user_access_granted_by_fkey | granted_by | NO ACTION |
| healthy_knowledge | healthy_knowledge_created_by_fkey | created_by | NO ACTION |
| hk_otp_codes | hk_otp_codes_partner_id_fkey | partner_id | NO ACTION |
| html_pages | html_pages_created_by_fkey | created_by | NO ACTION |
| leader_permissions | leader_permissions_activated_by_fkey | activated_by | NO ACTION |
| news_ticker_items | news_ticker_items_created_by_fkey | created_by | NO ACTION |
| paid_event_orders | paid_event_orders_user_id_fkey | user_id | NO ACTION |
| paid_events | paid_events_created_by_fkey | created_by | NO ACTION |
| partner_page_user_access | partner_page_user_access_granted_by_fkey | granted_by | NO ACTION |
| specialist_calculator_user_access | specialist_calculator_user_access_granted_by_fkey | granted_by | NO ACTION |
| translation_jobs | translation_jobs_created_by_fkey | created_by | NO ACTION |

### Rozwiązanie

Zmiana reguły usuwania na `SET NULL` dla kolumn referencyjnych typu "created_by", "issued_by", "granted_by", "activated_by", "resolved_by", "host_user_id". Te kolumny przechowują informację "kto utworzył/zatwierdzil", więc po usunięciu użytkownika powinny zostać ustawione na NULL (dane pozostają, ale tracą powiązanie z usuniętym użytkownikiem).

Dla kolumn będących głównym identyfikatorem użytkownika (np. `paid_event_orders.user_id`, `hk_otp_codes.partner_id`) -- użycie `CASCADE` (usunięcie powiązanych rekordów wraz z użytkownikiem).

### Szczegoly techniczne

Migracja SQL wykona dla każdej z 17 tabel:
1. `ALTER TABLE ... DROP CONSTRAINT ...`
2. `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY ... REFERENCES auth.users(id) ON DELETE SET NULL` lub `ON DELETE CASCADE`

Podział:
- **SET NULL** (kolumny "kto utworzył" -- dane pozostają): events.created_by, events.host_user_id, certificates.issued_by, admin_alerts.resolved_by, calculator_user_access.granted_by, healthy_knowledge.created_by, html_pages.created_by, leader_permissions.activated_by, news_ticker_items.created_by, paid_events.created_by, partner_page_user_access.granted_by, specialist_calculator_user_access.granted_by, translation_jobs.created_by
- **CASCADE** (dane powiązane z użytkownikiem -- usuwane): paid_event_orders.user_id, hk_otp_codes.partner_id

Kolumny z SET NULL muszą dopuszczać wartość NULL. Migracja doda `ALTER COLUMN ... DROP NOT NULL` tam, gdzie to konieczne.

### Pliki do zmian

| Element | Zmiana |
|---------|--------|
| Migracja SQL | Zmiana 17 foreign key constraints na SET NULL lub CASCADE |
| Bez zmian w kodzie | Edge function `admin-delete-user` nie wymaga zmian -- problem jest wyłącznie na poziomie bazy danych |
