

# Analiza eksportu kontaktów prywatnych

## Diagnoza

Eksport jest zablokowany przez ustawienie w bazie: `allow_team_contacts_export = false` w tabeli `ai_compass_settings`. To jest widoczne na screenshocie — komunikat "Eksport jest wyłączony przez administratora".

## Aktualny stan eksportu

### Formaty: 3 opcje
1. **Excel (.xlsx)** — pełne dane tabelaryczne
2. **HTML** — tabela w przeglądarce, gotowa do druku
3. **Word (.doc)** — HTML z nagłówkami MS Office

### Dane zawarte w eksporcie

**Excel** (najbogatszy):
- Imię, Nazwisko, EQID, Rola, Status (client/partner), Status relacji
- Telefon, Email, Adres, Zawód, Data dodania
- Opcjonalnie: Notatki
- Dla klientów: Zakupiony produkt, Data zakupu
- Dla nie-klientów: Poziom współpracy, Data rozpoczęcia

**HTML i Word** (ograniczone):
- Imię i nazwisko, EQID, Rola, Status relacji, Telefon, Email
- HTML opcjonalnie: Notatki
- Word: brak notatek

### Problemy
- Eksport jest zaprojektowany pod kontakty zespołowe (nazwy plików: `kontakty-zespolu-*`), nie pod kontakty prywatne
- Dane jak `purchased_product`, `collaboration_level` nie istnieją w kontaktach prywatnych — te pola będą puste
- Brak pól specyficznych dla kontaktów prywatnych: `contact_source`, `contact_reason`, `products`, `reminder_date`

## Plan naprawy

### 1. Migracja SQL — włączenie eksportu
```sql
UPDATE ai_compass_settings SET allow_team_contacts_export = true;
```

### 2. Dopasowanie danych eksportu do kontaktów prywatnych
W `TeamContactExport.tsx` zaktualizować mapowanie danych, żeby uwzględniało pola kontaktów prywatnych:
- Dodać: Źródło kontaktu (`contact_source`), Powód kontaktu (`contact_reason`), Produkty (`products`), Data przypomnienia (`reminder_date`)
- Usunąć/pominąć pola nieistniejące w kontaktach prywatnych (EQID, Rola, `purchased_product`, `collaboration_level`)
- Zmienić nazwy plików z `kontakty-zespolu-*` na `kontakty-prywatne-*`
- Zaktualizować tytuły w HTML/Word na "Kontakty prywatne"

### Pliki do zmiany
- Migracja SQL — `allow_team_contacts_export = true`
- `src/components/team-contacts/TeamContactExport.tsx` — dopasowanie pól i nazw do kontaktów prywatnych

