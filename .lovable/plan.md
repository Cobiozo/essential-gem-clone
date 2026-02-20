

# Opiekun = Lider: zatwierdzenie w Panelu Lidera aktywuje konto

## Obecny problem

Gdy Mateusz Sumera jest jednoczesnie opiekunem (upline) i liderem z uprawnieniem `can_approve_registrations`, proces wymaga **dwoch oddzielnych zatwierdzen**:

1. Pure-kontakty --> "Zatwierdz" --> `guardian_approve_user()` (jako opiekun)
2. Panel Lidera --> Zatwierdzenia --> "Zatwierdz" --> `leader_approve_user()` (jako lider)

To jest zbedne -- ta sama osoba klika dwa razy w dwoch roznych miejscach.

## Nowa zasada

**Jezeli lider = opiekun (ta sama osoba)**, to:
- Uzytkownik pojawia sie **od razu w Panelu Lidera** w zakladce "Zatwierdzenia"
- Jedno klikniecie "Zatwierdz" w Panelu Lidera **w pelni aktywuje konto** (pomija krok opiekuna, bo opiekun = lider)
- Uzytkownik NIE pojawia sie w Pure-kontakty jako "oczekujacy na zatwierdzenie opiekuna"

## Plan zmian

### Zmiana 1: Funkcja SQL `guardian_approve_user`

Wewnatrz bloku `IF v_leader_approver_id IS NOT NULL THEN` (linia 308), dodac warunek:

```text
IF v_leader_approver_id = auth.uid() THEN
  -- Opiekun = Lider --> nie robimy nic wiecej tutaj
  -- Konto czeka na zatwierdzenie w Panelu Lidera
  -- guardian_approved juz ustawione na TRUE powyzej
  RETURN TRUE;
END IF;
```

Ale to wymaga ze opiekun i tak najpierw klika w Pure-kontakty. Wiec lepsze podejscie:

### Zmiana 1 (poprawiona): Funkcja SQL `handle_new_user` (trigger rejestracji)

W triggerze rejestracji nowego uzytkownika, po znalezieniu `guardian_user_id`, sprawdzic:

```text
v_leader_approver_id := find_nearest_leader_approver(NEW.id);

JEZELI v_leader_approver_id = guardian_user_id WTEDY:
  -- Opiekun jest jednoczesnie liderem
  -- Od razu ustaw guardian_approved = TRUE (auto-skip kroku opiekuna)
  -- Ustaw leader_approver_id = guardian_user_id
  -- Uzytkownik pojawi sie w Panelu Lidera do zatwierdzenia
```

### Zmiana 2: Funkcja SQL `get_pending_leader_approvals`

Obecny filtr: `WHERE p.guardian_approved = true AND p.admin_approved = false AND p.leader_approver_id = auth.uid()`

Ten filtr juz dziala poprawnie -- jezeli w triggerze ustawimy `guardian_approved = true` i `leader_approver_id`, uzytkownik pojawi sie w liscie lidera.

### Zmiana 3: Funkcja SQL `leader_approve_user`

Obecna logika juz ustawia `admin_approved = true` (pelna aktywacja). Bez zmian.

## Szczegoly techniczne migracji SQL

### Modyfikacja `handle_new_user()`:

Po linii gdzie znajdujemy `guardian_user_id` (obecna logika), dodac:

```text
-- Sprawdz czy opiekun jest jednoczesnie liderem z uprawnieniami zatwierdzania
IF guardian_user_id IS NOT NULL THEN
  IF EXISTS (
    SELECT 1 FROM leader_permissions lp
    WHERE lp.user_id = guardian_user_id
      AND lp.can_approve_registrations = true
  ) THEN
    -- Opiekun = Lider: auto-approve guardian step
    -- Uzytkownik trafi bezposrednio do Panelu Lidera
    UPDATE profiles SET
      guardian_approved = true,
      guardian_approved_at = now(),
      leader_approver_id = guardian_user_id
    WHERE user_id = NEW.id;

    -- Powiadom lidera-opiekuna w Panelu Lidera (nie w Pure-kontakty)
    INSERT INTO user_notifications (
      user_id, notification_type, source_module, title, message, link, metadata
    ) VALUES (
      guardian_user_id,
      'approval_request',
      'registration',
      'Nowa osoba oczekuje na Twoje zatwierdzenie w Panelu Lidera',
      format('%s %s zarejestrował sie wskazujac Ciebie jako opiekuna. Jako Lider mozesz zatwierdzic konto jednym kliknieciem w Panelu Lidera.',
        new_user_first_name, new_user_last_name),
      '/leader?tab=approvals',
      jsonb_build_object('new_user_id', NEW.id, 'auto_guardian_approved', true)
    );

    -- NIE wysylaj powiadomienia "oczekuje na zatwierdzenie opiekuna" w Pure-kontakty
    -- (pomijamy standardowe powiadomienie ponizej)
  ELSE
    -- Standardowy przeplyw: opiekun NIE jest liderem
    -- (obecna logika powiadomienia do opiekuna bez zmian)
  END IF;
END IF;
```

### Modyfikacja `guardian_approve_user()`:

Dodac warunek na poczatku: jezeli `guardian_approved` juz jest TRUE (bo auto-approved w triggerze), to zwroc informacje ze uzytkownik czeka w Panelu Lidera:

```text
IF EXISTS (SELECT 1 FROM profiles WHERE user_id = target_user_id AND guardian_approved = TRUE) THEN
  RAISE EXCEPTION 'Uzytkownik jest juz zatwierdzony przez opiekuna. Jezeli jestes tez Liderem, zatwierdz go w Panelu Lidera.';
END IF;
```

Ta walidacja juz istnieje (linia 294), wiec nie wymaga zmian.

## Podsumowanie przeplywu

| Scenariusz | Rejestracja | Zatwierdzenie | Rezultat |
|---|---|---|---|
| Opiekun = Lider | Trigger auto-ustawia `guardian_approved=true`, `leader_approver_id` | 1 klikniecie w Panelu Lidera | Konto w pelni aktywne |
| Opiekun (nie lider), jest lider w sciezce | Trigger standardowy | Opiekun zatwierdza w Pure-kontakty, potem Lider w Panelu Lidera | Konto aktywne po 2 krokach |
| Opiekun, brak lidera | Trigger standardowy | Opiekun zatwierdza, potem Admin | Konto aktywne po 2 krokach |

## Pliki do zmiany

| Element | Zmiana |
|---|---|
| Migracja SQL: `handle_new_user()` | Dodanie wykrywania opiekun=lider, auto `guardian_approved`, przekierowanie do Panelu Lidera |
| Migracja SQL: `guardian_approve_user()` | Drobna zmiana komunikatu bledu (opcjonalna, walidacja juz istnieje) |
| Brak zmian frontendowych | `useLeaderApprovals`, `leader_approve_user`, Panel Lidera -- wszystko dziala bez zmian |

