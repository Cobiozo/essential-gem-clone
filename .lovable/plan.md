## Plan poprawki widoku wiadomości

1. **Ustabilizować wysokość ekranu wiadomości**
   - Zmienić główny kontener `/messages`, aby na mobile używał bezpiecznej wysokości widoku i nie pozwalał całej stronie przewijać się razem z dolnym paskiem.
   - Dodać dolny odstęp tylko tam, gdzie potrzebny, żeby systemowy `MobileBottomNav` nie zasłaniał pola wpisywania i ikon.

2. **Zrobić stałe elementy rozmowy**
   - Nagłówek rozmowy zostaje na górze.
   - Pole wpisywania wiadomości z ikonami załącznika/emoji/nagrywania/wysyłki zostaje stale widoczne nad dolną nawigacją.
   - Przewijalna ma być wyłącznie lista wiadomości między nagłówkiem a polem wpisywania.

3. **Poprawić dolny panel wpisywania na mobile**
   - Dodać stabilne `shrink-0`, bezpieczny odstęp `env(safe-area-inset-bottom)` i tło, żeby panel nie „wchodził” pod dolne menu.
   - Zachować wszystkie obecne opcje: załącznik, emoji, nagranie głosowe, wysyłka.

4. **Zabezpieczyć okna dialogowe**
   - Dla okna załączników/akcji rozmowy zostawić dialog przewijalny, ale bez przesuwania nagłówka, pola wpisywania i dolnej nawigacji.

## Pliki do zmiany

- `src/pages/MessagesPage.tsx`
- `src/components/messages/FullChatWindow.tsx`
- `src/components/unified-chat/MessageInput.tsx`

## Weryfikacja

- Sprawdzić układ na viewport mobile 390×844: widoczne wszystkie ikony na dole, pole wpisywania nie jest przykryte, przewija się tylko historia rozmowy.