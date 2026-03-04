
Cel: w oknie „Edytuj kontakt” zostawić tylko jeden pionowy pasek przewijania.

Diagnoza:
- Obecnie przewijanie jest w dwóch miejscach jednocześnie:
  1) `DialogContent` w `TeamContactsTab.tsx` ma `overflow-y-auto`
  2) `<form>` w `PrivateContactForm.tsx` ma `max-h-[70vh] overflow-y-auto`
- To daje dwa niezależne scrollbary widoczne obok siebie.

Plan wdrożenia:
1. Ujednolicić scroll do poziomu modala (jeden scrollbar).
2. W `src/components/team-contacts/PrivateContactForm.tsx` usunąć z klasy formularza:
   - `max-h-[70vh]`
   - `overflow-y-auto`
   (zostawić zwykły layout formularza bez własnego scrolla).
3. W `src/components/team-contacts/TeamContactsTab.tsx` zostawić przewijanie na `DialogContent` (jak teraz), żeby cały modal miał jeden wspólny scroll.
4. Sprawdzić oba przypadki:
   - Dodawanie kontaktu prywatnego
   - Edycja istniejącego kontaktu prywatnego
   i potwierdzić, że jest tylko jeden pionowy pasek przewijania.

Dodatkowa uwaga techniczna:
- Nie ruszam logiki zapisu ani walidacji — zmiana dotyczy wyłącznie UX/scroll w warstwie UI, żeby nie wpływać na ostatnie poprawki związane z zapisem kontaktu.
