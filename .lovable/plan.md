

# Personalizacja treści emaila — dane partnera i link kontaktowy

## Co się zmienia

Aktualnie email wysyłany do leada (linie 277-291 w `save-partner-lead/index.ts`) jest generyczny — mówi „Zespół Pure Life" bez żadnych danych partnera. 

Zmieniamy treść HTML emaila, aby zawierała:
1. **Dane partnera** — imię, nazwisko, specjalizacja, telefon
2. **Przycisk/link „Napisz do opiekuna"** — mailto link na email partnera
3. **Awatar partnera** (jeśli dostępny)

## Zmiana

### Plik: `supabase/functions/save-partner-lead/index.ts`

**Linie 277-291** — zastąpić generyczny HTML nową wersją, która korzysta z już pobranych danych `partnerData` (linia 222):

```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2>Cześć {recipientFirstName}!</h2>
  <p>Dziękujemy za wypełnienie formularza. W załączniku znajdziesz poradnik, 
     który przygotował/a dla Ciebie Twój opiekun.</p>

  <!-- Sekcja partnera -->
  <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 24px 0;">
    {avatar jeśli dostępny}
    <h3>{imię} {nazwisko}</h3>
    <p>{specjalizacja}</p>
    <p>Tel: {telefon}</p>
    <a href="mailto:{email}" style="button-style">Napisz do mnie</a>
  </div>

  <p>Pozdrawiamy,<br/><strong>Zespół Pure Life</strong></p>
</div>
```

Dane partnera (`first_name`, `last_name`, `email`, `phone_number`, `specialization`, `avatar_url`) są już pobrane w linii 216-221 jako `partnerData` — wystarczy je wstawić do HTML.

### Redeploy
`save-partner-lead`

| Plik | Zmiana |
|------|--------|
| `supabase/functions/save-partner-lead/index.ts` | Personalizacja treści emaila danymi partnera + link mailto |

