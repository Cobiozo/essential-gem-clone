

# Plan: Nagłówek w eksporcie Excel

## Problem
Excel export zawiera tylko tabelę danych, bez nagłówka. HTML export ma: tytuł "Kontakty prywatne", datę wygenerowania i liczbę kontaktów. Excel powinien mieć to samo.

## Zmiana w `TeamContactExport.tsx`

W `handleExportExcel`, przed tabelą HTML dodać wiersze nagłówkowe — tak jak w HTML export:

```html
<h1 style="font-family:Calibri;color:#2E7D32">Kontakty prywatne</h1>
<p style="font-family:Calibri">Wygenerowano: {data}</p>
<p style="font-family:Calibri">Liczba kontaktów: {count}</p>
<br/>
```

Te elementy pojawią się w Excelu nad tabelą (Excel renderuje HTML z `<h1>`, `<p>` i `<br>` jako osobne wiersze arkusza).

## Plik do zmiany
- `src/components/team-contacts/TeamContactExport.tsx` — dodanie nagłówka w `handleExportExcel`

