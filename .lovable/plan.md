

## Zmiany w sekcji "Zgody i regulaminy" w MyAccount.tsx

### Co sie zmieni

**1. Pozycja "Wyrazam zgode RODO" -- dodanie tekstu informacyjnego**

Pod checkboxem "Wyrazam zgode RODO" (zamiast linku "Przeczytaj informacje RODO") zostanie dodany ten sam tekst informacyjny co w polu RODO powyzej przycisku "Zapisz dane adresowe":

> **Informacja RODO:** Podane dane osobowe sa przetwarzane zgodnie z obowiazujacymi przepisami RODO i wykorzystywane wylacznie w celach zwiazanych z funkcjonowaniem konta uzytkownika. Masz prawo wgladu, edycji oraz usuniecia swoich danych.

Tekst bedzie uzywal tych samych kluczy tlumaczen `t('myAccount.gdprNotice')` i `t('myAccount.gdprText')`.

**2. Zablokowanie edycji raz wyrazonych zgod**

Po zatwierdzeniu wszystkich zgod:
- Checkboxy pozostaja zablokowane (juz dziala)
- Przycisk "Zatwierdz zgody" znika (juz dziala)
- Dodanie informacji tekstowej: "Zmiana zgod jest mozliwa wylacznie poprzez formularz kontaktowy lub e-mail na adres support@purelife.info.pl"

### Plik do zmian

| Plik | Zmiana |
|------|--------|
| `src/pages/MyAccount.tsx` | W sekcji RODO (linie 933-961): zastapienie linka "Przeczytaj informacje RODO" tekstem informacyjnym RODO. Dodanie informacji o kontakcie pod sekcja zgod. |

### Szczegoly techniczne

W bloku RODO (linie 951-959) link zostanie zastapiony blokiem `div` z tekstem informacyjnym w stylu `bg-muted/50 p-3 rounded border text-xs`.

Pod data akceptacji (po linii 970) dodanie akapitu z informacja o zmianie zgod przez formularz kontaktowy / email `support@purelife.info.pl`.
