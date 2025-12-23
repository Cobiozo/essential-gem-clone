import { EmailBlock } from './types';

export const createDefaultBlocks = (): EmailBlock[] => [
  {
    id: `block-${Date.now()}-1`,
    type: 'header',
    content: {
      text: 'Tytuł wiadomości',
      backgroundColor: '#16a34a',
      textColor: '#ffffff',
      showLogo: true,
    },
    position: 0,
  },
  {
    id: `block-${Date.now()}-2`,
    type: 'text',
    content: {
      html: '<p>Cześć <strong>{{imię}}</strong>,</p><p>Tutaj wpisz treść wiadomości...</p>',
    },
    position: 1,
  },
  {
    id: `block-${Date.now()}-3`,
    type: 'button',
    content: {
      text: 'Przejdź do akcji',
      url: '#',
      backgroundColor: '#16a34a',
      textColor: '#ffffff',
      align: 'center',
    },
    position: 2,
  },
  {
    id: `block-${Date.now()}-4`,
    type: 'text',
    content: {
      html: '<p>Pozdrawiamy,<br><strong>Zespół Pure Life</strong></p>',
    },
    position: 3,
  },
  {
    id: `block-${Date.now()}-5`,
    type: 'footer',
    content: {
      html: '<p style="text-align: center; color: #6b7280; font-size: 12px;">© 2024 Pure Life / Eqology. Wszelkie prawa zastrzeżone.</p>',
    },
    position: 4,
  },
];

// Template-specific default blocks
export const getTemplateBlocks = (internalName: string): EmailBlock[] => {
  const timestamp = Date.now();
  
  switch (internalName) {
    case 'activation_email':
      return [
        { id: `block-${timestamp}-1`, type: 'header', content: { text: 'Aktywacja konta', backgroundColor: '#16a34a', textColor: '#ffffff', showLogo: true }, position: 0 },
        { id: `block-${timestamp}-2`, type: 'text', content: { html: '<p>Cześć <strong>{{imię}}</strong>,</p><p>Dziękujemy za rejestrację w systemie Pure Life! Kliknij przycisk poniżej, aby aktywować swoje konto.</p>' }, position: 1 },
        { id: `block-${timestamp}-3`, type: 'button', content: { text: 'Aktywuj konto', url: '{{link_aktywacyjny}}', backgroundColor: '#16a34a', textColor: '#ffffff', align: 'center' }, position: 2 },
        { id: `block-${timestamp}-4`, type: 'box', content: { variant: 'warning', title: 'Ważne', content: 'Link jest ważny przez 24 godziny. Jeśli nie rejestrowałeś się, zignoruj tę wiadomość.' }, position: 3 },
        { id: `block-${timestamp}-5`, type: 'text', content: { html: '<p>Pozdrawiamy,<br><strong>Zespół Pure Life</strong></p>' }, position: 4 },
        { id: `block-${timestamp}-6`, type: 'footer', content: { html: '<p style="text-align: center; color: #6b7280; font-size: 12px;">© 2024 Pure Life / Eqology. Wszelkie prawa zastrzeżone.</p>' }, position: 5 },
      ];

    case 'password_reset':
      return [
        { id: `block-${timestamp}-1`, type: 'header', content: { text: 'Resetowanie hasła', backgroundColor: '#16a34a', textColor: '#ffffff', showLogo: true }, position: 0 },
        { id: `block-${timestamp}-2`, type: 'text', content: { html: '<p>Cześć <strong>{{imię}}</strong>,</p><p>Otrzymaliśmy prośbę o zresetowanie hasła do Twojego konta. Kliknij poniższy przycisk, aby ustawić nowe hasło:</p>' }, position: 1 },
        { id: `block-${timestamp}-3`, type: 'button', content: { text: 'Zresetuj hasło', url: '{{link_resetowania}}', backgroundColor: '#16a34a', textColor: '#ffffff', align: 'center' }, position: 2 },
        { id: `block-${timestamp}-4`, type: 'box', content: { variant: 'warning', title: 'Ważne', content: 'Link jest ważny przez 1 godzinę. Jeśli nie prosiłeś o reset hasła, zignoruj tę wiadomość.' }, position: 3 },
        { id: `block-${timestamp}-5`, type: 'text', content: { html: '<p>Pozdrawiamy,<br><strong>Zespół Pure Life</strong></p>' }, position: 4 },
        { id: `block-${timestamp}-6`, type: 'footer', content: { html: '<p style="text-align: center; color: #6b7280; font-size: 12px;">© 2024 Pure Life / Eqology. Wszelkie prawa zastrzeżone.</p>' }, position: 5 },
      ];

    case 'welcome_registration':
      return [
        { id: `block-${timestamp}-1`, type: 'header', content: { text: 'Witamy w Pure Life!', backgroundColor: '#16a34a', textColor: '#ffffff', showLogo: true }, position: 0 },
        { id: `block-${timestamp}-2`, type: 'text', content: { html: '<p>Cześć <strong>{{imię}}</strong>,</p><p>Gratulujemy! Twoje konto w systemie Pure Life zostało pomyślnie utworzone.</p>' }, position: 1 },
        { id: `block-${timestamp}-3`, type: 'box', content: { variant: 'success', title: 'Co dalej?', content: 'Zaloguj się do systemu i uzupełnij swój profil. Skontaktuj się ze swoim opiekunem, aby uzyskać wsparcie na start.' }, position: 2 },
        { id: `block-${timestamp}-4`, type: 'button', content: { text: 'Zaloguj się', url: '#', backgroundColor: '#16a34a', textColor: '#ffffff', align: 'center' }, position: 3 },
        { id: `block-${timestamp}-5`, type: 'text', content: { html: '<p>Pozdrawiamy,<br><strong>Zespół Pure Life</strong></p>' }, position: 4 },
        { id: `block-${timestamp}-6`, type: 'footer', content: { html: '<p style="text-align: center; color: #6b7280; font-size: 12px;">© 2024 Pure Life / Eqology. Wszelkie prawa zastrzeżone.</p>' }, position: 5 },
      ];

    case 'first_login_welcome':
      return [
        { id: `block-${timestamp}-1`, type: 'header', content: { text: 'Pierwsze logowanie!', backgroundColor: '#16a34a', textColor: '#ffffff', showLogo: true }, position: 0 },
        { id: `block-${timestamp}-2`, type: 'text', content: { html: '<p>Cześć <strong>{{imię}}</strong>,</p><p>Zalogowałeś się pierwszy raz do systemu Pure Life. Gratulacje!</p>' }, position: 1 },
        { id: `block-${timestamp}-3`, type: 'box', content: { variant: 'info', title: 'Zapoznaj się z systemem', content: 'Przejdź do zakładki Szkolenia, aby poznać możliwości platformy i rozpocząć swoją przygodę z Pure Life.' }, position: 2 },
        { id: `block-${timestamp}-4`, type: 'button', content: { text: 'Przejdź do szkolenia', url: '#', backgroundColor: '#16a34a', textColor: '#ffffff', align: 'center' }, position: 3 },
        { id: `block-${timestamp}-5`, type: 'text', content: { html: '<p>Życzymy sukcesów!<br><strong>Zespół Pure Life</strong></p>' }, position: 4 },
        { id: `block-${timestamp}-6`, type: 'footer', content: { html: '<p style="text-align: center; color: #6b7280; font-size: 12px;">© 2024 Pure Life / Eqology. Wszelkie prawa zastrzeżone.</p>' }, position: 5 },
      ];

    case 'password_changed':
      return [
        { id: `block-${timestamp}-1`, type: 'header', content: { text: 'Hasło zmienione', backgroundColor: '#16a34a', textColor: '#ffffff', showLogo: true }, position: 0 },
        { id: `block-${timestamp}-2`, type: 'text', content: { html: '<p>Cześć <strong>{{imię}}</strong>,</p><p>Twoje hasło do konta Pure Life zostało pomyślnie zmienione.</p>' }, position: 1 },
        { id: `block-${timestamp}-3`, type: 'box', content: { variant: 'success', title: 'Potwierdzenie', content: 'Zmiana hasła została wykonana dnia {{data}} o godzinie {{godzina}}.' }, position: 2 },
        { id: `block-${timestamp}-4`, type: 'box', content: { variant: 'warning', title: 'Nie zmieniałeś hasła?', content: 'Jeśli to nie Ty zmieniłeś hasło, natychmiast skontaktuj się z administracją.' }, position: 3 },
        { id: `block-${timestamp}-5`, type: 'text', content: { html: '<p>Pozdrawiamy,<br><strong>Zespół Pure Life</strong></p>' }, position: 4 },
        { id: `block-${timestamp}-6`, type: 'footer', content: { html: '<p style="text-align: center; color: #6b7280; font-size: 12px;">© 2024 Pure Life / Eqology. Wszelkie prawa zastrzeżone.</p>' }, position: 5 },
      ];

    case 'admin_notification':
      return [
        { id: `block-${timestamp}-1`, type: 'header', content: { text: 'Wiadomość od administracji', backgroundColor: '#16a34a', textColor: '#ffffff', showLogo: true }, position: 0 },
        { id: `block-${timestamp}-2`, type: 'text', content: { html: '<p>Cześć <strong>{{imię}}</strong>,</p><p>Administrator wykonał akcję dotyczącą Twojego konta lub systemu.</p>' }, position: 1 },
        { id: `block-${timestamp}-3`, type: 'box', content: { variant: 'info', title: 'Szczegóły akcji', content: 'Treść wiadomości od administratora...' }, position: 2 },
        { id: `block-${timestamp}-4`, type: 'text', content: { html: '<p>W razie pytań, skontaktuj się z administracją.</p><p>Pozdrawiamy,<br><strong>Zespół Pure Life</strong></p>' }, position: 3 },
        { id: `block-${timestamp}-5`, type: 'footer', content: { html: '<p style="text-align: center; color: #6b7280; font-size: 12px;">© 2024 Pure Life / Eqology. Wszelkie prawa zastrzeżone.</p>' }, position: 4 },
      ];

    case 'system_reminder':
      return [
        { id: `block-${timestamp}-1`, type: 'header', content: { text: 'Przypomnienie', backgroundColor: '#f59e0b', textColor: '#ffffff', showLogo: true }, position: 0 },
        { id: `block-${timestamp}-2`, type: 'text', content: { html: '<p>Cześć <strong>{{imię}}</strong>,</p><p>Mamy dla Ciebie ważne przypomnienie z systemu Pure Life.</p>' }, position: 1 },
        { id: `block-${timestamp}-3`, type: 'box', content: { variant: 'warning', title: 'Przypomnienie', content: 'Treść przypomnienia systemowego...' }, position: 2 },
        { id: `block-${timestamp}-4`, type: 'button', content: { text: 'Przejdź do systemu', url: '#', backgroundColor: '#f59e0b', textColor: '#ffffff', align: 'center' }, position: 3 },
        { id: `block-${timestamp}-5`, type: 'text', content: { html: '<p>Pozdrawiamy,<br><strong>Zespół Pure Life</strong></p>' }, position: 4 },
        { id: `block-${timestamp}-6`, type: 'footer', content: { html: '<p style="text-align: center; color: #6b7280; font-size: 12px;">© 2024 Pure Life / Eqology. Wszelkie prawa zastrzeżone.</p>' }, position: 5 },
      ];

    default:
      return createDefaultBlocks();
  }
};
