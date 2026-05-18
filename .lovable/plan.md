Plan naprawy:

1. Naprawię błąd React #310 na `/aktualnosci` przez usunięcie zależności listy od lokalnego przełączania układu admina na stronie publicznej. Hooki zostaną wywoływane zawsze w tej samej kolejności, a warunkowe renderowanie zostanie ograniczone do UI.

2. Zmieniam zachowanie ikon układu na stronie `/aktualnosci`:
   - widzi je tylko admin,
   - kliknięcie ikony zapisuje układ globalnie jako `adminLayout` w `news_hub_settings`,
   - nie używamy już lokalnego `userLayout`/`Resetuj` na publicznej stronie Aktualności.

3. Dla partnera/użytkownika lista będzie renderowana wyłącznie według `adminLayout`, czyli jeśli admin ustawił `cols-3`, partner zobaczy trzy kolumny bez ikon konfiguracji.

4. Dodatkowo dopiszę `/aktualnosci` do listy znanych tras w wrapperze czatu (`ChatWidgetsWrapper`), żeby aplikacja nie traktowała tej ścieżki jako strony partnera.

5. Po wdrożeniu sprawdzę w preview, czy strona nie wpada w ErrorBoundary i czy admin widzi przełącznik układu.