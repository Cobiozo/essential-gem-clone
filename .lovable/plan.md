Naprawię komunikat po zgłoszeniu tak, aby dla wydarzeń bezpłatnych nie pojawiało się „oraz danymi do płatności” ani w bannerze po rejestracji, ani w e-mailu.

Zakres zmian:
1. `src/pages/EventFormPublicPage.tsx`
   - Rozszerzę pobieranie wydarzenia o informację, czy wydarzenie jest bezpłatne.
   - Jeśli wydarzenie jest bezpłatne, komunikat sukcesu będzie brzmiał tylko: „Na adres [email] wysłaliśmy email z potwierdzeniem.”
   - Jeśli wydarzenie jest płatne, zostanie dotychczasowy tekst z danymi do płatności.

2. `supabase/functions/send-event-form-confirmation/index.ts`
   - Pobiorę z `paid_events` pole `is_free` oraz w razie potrzeby aktywne bilety, żeby poprawnie rozpoznać wydarzenie bezpłatne także wtedy, gdy flaga nie jest ustawiona, ale wszystkie bilety mają cenę 0.
   - Dla wydarzenia bezpłatnego nie będę dodawał sekcji „Dane do płatności” do e-maila, nawet jeśli formularz ma uzupełnione `payment_details`.
   - Dla wydarzenia płatnego działanie pozostanie bez zmian.

3. Po zmianach wdrożę funkcję `send-event-form-confirmation`, żeby nowy mail działał od razu w produkcji.