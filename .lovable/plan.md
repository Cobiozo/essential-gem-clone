## Problem

W e-mailu potwierdzającym rejestrację na wydarzenie (po wypełnieniu formularza przez link partnerski) brakuje sekcji „Twój opiekun / osoba zapraszająca". Dane partnera są w bazie (`event_form_submissions.partner_user_id`), ale Edge Function `send-event-form-confirmation` ich nie pobiera ani nie renderuje w wiadomości.

## Cel

Dodać do e-maila potwierdzającego rejestrację sekcję z danymi partnera, który zaprosił gościa — żeby uczestnik wiedział, do kogo się zwracać w razie pytań.

## Zmiany

### 1. `supabase/functions/send-event-form-confirmation/index.ts`

Po pobraniu `sub`, dociągnąć dane partnera, jeśli `sub.partner_user_id` jest ustawione:

```ts
let partner: { name: string; email: string | null; phone: string | null; avatarUrl: string | null } | null = null;
if (sub.partner_user_id) {
  const { data: p } = await supabase
    .from('profiles')
    .select('first_name, last_name, email, phone_number, avatar_url')
    .eq('user_id', sub.partner_user_id)
    .maybeSingle();
  if (p) {
    partner = {
      name: [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Twój opiekun',
      email: p.email || null,
      phone: p.phone_number || null,
      avatarUrl: p.avatar_url || null,
    };
  }
}
```

Przekazać `partner` do `buildEmail` jako nowe (opcjonalne) pole `partner`.

### 2. Sekcja partnera w `buildEmail`

Wstawić nowy blok HTML między blokiem płatności a tabelą z danymi zgłoszeniowymi (lub na końcu, przed CTA — patrz „Pozycja"):

```html
<div style="background:#f4f8fb;border-left:4px solid #3b82f6;padding:18px 22px;border-radius:8px;margin:20px 0;">
  <h3 style="margin:0 0 10px;color:#1e3a8a;font-size:16px;">👤 Twój opiekun</h3>
  <p style="margin:4px 0;"><strong>Imię i nazwisko:</strong> {partner.name}</p>
  {partner.email ? <p>📧 <a href="mailto:...">{partner.email}</a></p>}
  {partner.phone ? <p>📞 <a href="tel:...">{partner.phone}</a></p>}
  <p style="margin:10px 0 0;font-size:13px;color:#555;">
    W razie pytań dotyczących wydarzenia możesz skontaktować się bezpośrednio z osobą, która Cię zaprosiła.
  </p>
</div>
```

Blok renderowany tylko jeśli `partner` istnieje (jest `partner_user_id`). Jeśli rejestracja przyszła bez partnera (np. bezpośredni link admin), sekcja nie pojawia się.

**Pozycja w mailu**: między blokiem „Dane do płatności" a tabelą „Twoje dane zgłoszeniowe" — żeby uczestnik widział jednocześnie dane do przelewu i kontakt do partnera.

**Bezpieczeństwo / prywatność**: pokazujemy tylko imię, nazwisko, email i telefon partnera (te same dane, które partner świadomie udostępnia jako swoje publiczne dane kontaktowe na platformie, bo używa linków partnerskich).

### 3. Deploy

Po zmianach wywołać deploy edge function `send-event-form-confirmation`. Brak migracji DB — wszystkie potrzebne pola już istnieją.

## Plik

- `supabase/functions/send-event-form-confirmation/index.ts`

## Co zmieni odbiorca

W mailu, pod „Dane do płatności", pojawi się dodatkowy blok „Twój opiekun" z imieniem, nazwiskiem, klikalnym e-mailem i telefonem partnera, który wysłał zaproszenie. Dotyczy wyłącznie zgłoszeń zarejestrowanych przez link partnerski.