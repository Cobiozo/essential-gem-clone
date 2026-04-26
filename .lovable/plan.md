## Co robimy

### 1. Admin może całkowicie usunąć zgłoszenie (gość lub partner)

W `EventFormSubmissions.tsx` — obok istniejących akcji (potwierdź, anuluj, wyślij ponownie) dodaję czerwony przycisk **kosza** (ikona `Trash2`) z dwustopniowym potwierdzeniem (`window.confirm` + ostrzeżenie tekstowe).

Implementacja:
- Mutacja `deleteSubmission` używa bezpośrednio `supabase.from('event_form_submissions').delete().eq('id', submissionId)`.
- RLS już pozwala adminom (`Admins manage event form submissions` z `ALL`), brak tabel zależnych z FK na `event_form_submissions` — usunięcie jest bezpieczne i atomowe.
- Po sukcesie: invalidate query `['event-form-submissions', form.id]` + `['event-form-submission-counts']` + toast „Zgłoszenie usunięte".
- Działa identycznie dla gości i partnerów (jedna kolumna `id`, jedna polityka RLS).

UI w komórce „Akcje":
```tsx
<Button size="sm" variant="ghost" title="Usuń całkowicie" onClick={() => {
  if (!window.confirm(`Usunąć całkowicie zgłoszenie ${s.first_name} ${s.last_name} (${s.email})? Tej operacji nie można cofnąć.`)) return;
  deleteSubmission.mutate(s.id);
}}>
  <Trash2 className="w-4 h-4 text-destructive" />
</Button>
```

Brak zmian w bazie, brak nowych edge functions.

### 2. Partner klika EVENT → Szczegóły / Zapisz się → ten sam widok co z zakładki „Eventy"

Aktualnie w `CalendarWidget.tsx` używamy `window.open('/events/:slug', '_blank', ...)` — paid event otwiera się w **nowej karcie**, bez sidebar/nawigacji partnera, oraz z nieprawidłowym query `?ref=EQID` (paid eventy używają `ref_code` z `paid_event_partner_links`, który `PaidEventPage` i tak generuje automatycznie dla zalogowanego partnera).

Naprawa w gałęzi `paid_event` w `CalendarWidget.tsx`:
- Zamiast `window.open(...)` → `navigate('/events/' + slug)` (z `useNavigate` z `react-router-dom`).
- Usuwam `?ref=eq_id` — `PaidEventPage` (linie 184-205) sam tworzy/pobiera `ref_code` partnera dla aktywnego formularza.
- Klik prowadzi do **tej samej trasy** `/events/:slug` co `PaidEventCard.onClick` w `/paid-events`, więc partner widzi identyczny ekran z hero, sekcjami treści, biletami i formularzem rejestracji — z zachowanym sidebar/topbar pulpitu.

Pozostała logika widżetu (kropki, legenda EVENT, kafelek dnia z tytułem i godziną, pozostałe typy wydarzeń) — bez zmian.

## Bezpieczeństwo

- RLS niezmienione; admin DELETE już dozwolone polityką `ALL`.
- Brak FK referencji do `event_form_submissions`, więc `DELETE` nie generuje sierot.
- `navigate()` zachowuje sesję i kontekst auth; brak nowych dziur uprawnieniowych — `PaidEventPage` jest publicznie dostępna (już otwarta dla gości i partnerów).

## Pliki

- `src/components/admin/paid-events/event-forms/EventFormSubmissions.tsx` — przycisk kosza + mutacja `deleteSubmission`.
- `src/components/dashboard/widgets/CalendarWidget.tsx` — `useNavigate` + zamiana `window.open` na `navigate` w gałęzi `paid_event`, usunięcie zbędnego `?ref=eq_id`.