import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'pl' | 'de' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations = {
  pl: {
    // Navigation
    'nav.home': 'Strona główna',
    'nav.admin': 'Panel CMS',
    'nav.myAccount': 'Moje konto',
    'nav.login': 'Zaloguj się',
    'nav.logout': 'Wyloguj się',
    
    // Auth
    'auth.signIn': 'Zaloguj się',
    'auth.email': 'Email',
    'auth.password': 'Hasło',
    'auth.confirmPassword': 'Potwierdź hasło',
    'auth.signUp': 'Zarejestruj się',
    'auth.signUpLink': 'Nie masz konta? Zarejestruj się',
    'auth.signInLink': 'Masz już konto? Zaloguj się',
    'auth.resetPassword': 'Resetuj hasło',
    'auth.resetPasswordLink': 'Zapomniałeś hasła?',
    
    // Admin Panel
    'admin.title': 'Panel administracyjny',
    'admin.cmsManagement': 'Zarządzanie treścią',
    'admin.sections': 'Sekcje',
    'admin.pages': 'Strony',
    'admin.userManagement': 'Zarządzanie użytkownikami',
    'admin.addSection': 'Dodaj sekcję',
    'admin.addPage': 'Dodaj stronę',
    'admin.sectionTitle': 'Tytuł sekcji',
    'admin.pageTitle': 'Tytuł strony',
    'admin.slug': 'Slug',
    'admin.content': 'Treść',
    'admin.save': 'Zapisz',
    'admin.cancel': 'Anuluj',
    'admin.edit': 'Edytuj',
    'admin.delete': 'Usuń',
    'admin.active': 'Aktywny',
    'admin.inactive': 'Nieaktywny',
    'admin.visibleToPartners': 'Widoczne dla partnerów',
    'admin.visibleToClients': 'Widoczne dla klientów',
    'admin.visibleToEveryone': 'Widoczne dla wszystkich',
    'admin.published': 'Opublikowane',
    'admin.unpublished': 'Nieopublikowane',
    'admin.contentManagement': 'Zarządzanie zawartością',
    'admin.fonts': 'Czcionki',
    'admin.colors': 'Kolory',
    'admin.textEditor': 'Edytor tekstu',
    'admin.account': 'Konto',
    'admin.users': 'Użytkownicy',
    'admin.sectionManagement': 'Zarządzanie sekcjami',
    'admin.addItem': 'Dodaj element',
    'admin.moveUp': 'Przenieś w górę',
    'admin.moveDown': 'Przenieś w dół',
    'admin.itemType': 'Typ elementu',
    'admin.itemTitle': 'Tytuł elementu',
    'admin.description': 'Opis',
    'admin.url': 'URL',
    'admin.icon': 'Ikona',
    'admin.media': 'Media',
    'admin.altText': 'Tekst alternatywny',
    'admin.uploadMedia': 'Prześlij media',
    'admin.formatting': 'Formatowanie',
    'admin.textFormatting': 'Formatowanie tekstu',
    'admin.titleFormatting': 'Formatowanie tytułu',
    'admin.metaTitle': 'Meta tytuł',
    'admin.metaDescription': 'Meta opis',
    'admin.pagePosition': 'Pozycja strony',
    'admin.pageVisibility': 'Widoczność strony',
    'admin.userRole': 'Rola użytkownika',
    'admin.userEmail': 'Email użytkownika',
    'admin.userStatus': 'Status użytkownika',
    'admin.confirmationSent': 'Potwierdzenie wysłane',
    'admin.emailConfirmed': 'Email potwierdzony',
    'admin.created': 'Utworzono',
    'admin.updated': 'Zaktualizowano',
    'admin.exportUsers': 'Eksportuj użytkowników',
    'admin.inviteUser': 'Zaproś użytkownika',
    'admin.loadingUsers': 'Ładowanie użytkowników...',
    'admin.loadingPages': 'Ładowanie stron...',
    'admin.noUsers': 'Brak użytkowników',
    'admin.noPages': 'Brak stron',
    'admin.noSections': 'Brak sekcji',
    'admin.noItems': 'Brak elementów w tej sekcji',
    
    // Common
    'common.loading': 'Ładowanie...',
    'common.error': 'Błąd',
    'common.success': 'Sukces',
    'common.close': 'Zamknij',
    'common.share': 'Udostępnij',
    'common.noContent': 'Brak treści',
    'common.position': 'Pozycja',
    
    // Account
    'account.myAccount': 'Moje konto',
    'account.profile': 'Profil',
    'account.updateProfile': 'Aktualizuj profil',
    
    // Errors
    'error.notFound': 'Strona nie została znaleziona',
    'error.forbidden': 'Brak dostępu',
    'error.returnHome': 'Powrót do strony głównej',
    
    // Share
    'share.section': 'Udostępnij sekcję',
    'share.copied': 'Link skopiowany do schowka!',
    
    // Page errors
    'page.accessDenied': 'Brak dostępu do strony',
    'page.contactAdmin': 'Ta strona jest dostępna tylko dla użytkowników z odpowiednimi uprawnieniami. Skontaktuj się z administratorem aby uzyskać dostęp.',
    'page.noContent': 'Ta strona nie ma jeszcze zawartości',
    'page.contentSoon': 'Zawartość zostanie dodana wkrótce.',
    'page.back': 'Wstecz',
    
    // Messages
    'messages.accountBlocked': 'Konto zablokowane',
    'messages.accountDeactivated': 'Twoje konto zostało dezaktywowane przez administratora. Nie masz dostępu do funkcji aplikacji.',
    'messages.contactAdminError': 'Jeśli uważasz, że to pomyłka, skontaktuj się z administratorem systemu.',
    'messages.welcomeBack': 'Witaj w systemie Pure Life!',
    'messages.loginSuccess': 'Zalogowano pomyślnie',
    'messages.passwordChanged': 'Hasło zostało pomyślnie zmienione.',
    'messages.passwordError': 'Nie udało się zmienić hasła.',
  },
  de: {
    // Navigation
    'nav.home': 'Startseite',
    'nav.admin': 'CMS-Panel',
    'nav.myAccount': 'Mein Konto',
    'nav.login': 'Anmelden',
    'nav.logout': 'Abmelden',
    
    // Auth
    'auth.signIn': 'Anmelden',
    'auth.email': 'E-Mail',
    'auth.password': 'Passwort',
    'auth.confirmPassword': 'Passwort bestätigen',
    'auth.signUp': 'Registrieren',
    'auth.signUpLink': 'Kein Konto? Registrieren',
    'auth.signInLink': 'Bereits ein Konto? Anmelden',
    'auth.resetPassword': 'Passwort zurücksetzen',
    'auth.resetPasswordLink': 'Passwort vergessen?',
    
    // Admin Panel
    'admin.title': 'Administrationsbereich',
    'admin.cmsManagement': 'Inhaltsverwaltung',
    'admin.sections': 'Bereiche',
    'admin.pages': 'Seiten',
    'admin.userManagement': 'Benutzerverwaltung',
    'admin.addSection': 'Bereich hinzufügen',
    'admin.addPage': 'Seite hinzufügen',
    'admin.sectionTitle': 'Bereichstitel',
    'admin.pageTitle': 'Seitentitel',
    'admin.slug': 'Slug',
    'admin.content': 'Inhalt',
    'admin.save': 'Speichern',
    'admin.cancel': 'Abbrechen',
    'admin.edit': 'Bearbeiten',
    'admin.delete': 'Löschen',
    'admin.active': 'Aktiv',
    'admin.inactive': 'Inaktiv',
    'admin.visibleToPartners': 'Sichtbar für Partner',
    'admin.visibleToClients': 'Sichtbar für Kunden',
    'admin.visibleToEveryone': 'Sichtbar für alle',
    'admin.published': 'Veröffentlicht',
    'admin.unpublished': 'Unveröffentlicht',
    'admin.contentManagement': 'Inhaltsverwaltung',
    'admin.fonts': 'Schriftarten',
    'admin.colors': 'Farben',
    'admin.textEditor': 'Texteditor',
    'admin.account': 'Konto',
    'admin.users': 'Benutzer',
    'admin.sectionManagement': 'Bereichsverwaltung',
    'admin.addItem': 'Element hinzufügen',
    'admin.moveUp': 'Nach oben verschieben',
    'admin.moveDown': 'Nach unten verschieben',
    'admin.itemType': 'Elementtyp',
    'admin.itemTitle': 'Elementtitel',
    'admin.description': 'Beschreibung',
    'admin.url': 'URL',
    'admin.icon': 'Icon',
    'admin.media': 'Medien',
    'admin.altText': 'Alt-Text',
    'admin.uploadMedia': 'Medien hochladen',
    'admin.formatting': 'Formatierung',
    'admin.textFormatting': 'Textformatierung',
    'admin.titleFormatting': 'Titelformatierung',
    'admin.metaTitle': 'Meta-Titel',
    'admin.metaDescription': 'Meta-Beschreibung',
    'admin.pagePosition': 'Seitenposition',
    'admin.pageVisibility': 'Seitensichtbarkeit',
    'admin.userRole': 'Benutzerrolle',
    'admin.userEmail': 'Benutzer-E-Mail',
    'admin.userStatus': 'Benutzerstatus',
    'admin.confirmationSent': 'Bestätigung gesendet',
    'admin.emailConfirmed': 'E-Mail bestätigt',
    'admin.created': 'Erstellt',
    'admin.updated': 'Aktualisiert',
    'admin.exportUsers': 'Benutzer exportieren',
    'admin.inviteUser': 'Benutzer einladen',
    'admin.loadingUsers': 'Benutzer werden geladen...',
    'admin.loadingPages': 'Seiten werden geladen...',
    'admin.noUsers': 'Keine Benutzer',
    'admin.noPages': 'Keine Seiten',
    'admin.noSections': 'Keine Bereiche',
    'admin.noItems': 'Keine Elemente in diesem Bereich',
    
    // Common
    'common.loading': 'Laden...',
    'common.error': 'Fehler',
    'common.success': 'Erfolg',
    'common.close': 'Schließen',
    'common.share': 'Teilen',
    'common.noContent': 'Kein Inhalt',
    'common.position': 'Position',
    
    // Account
    'account.myAccount': 'Mein Konto',
    'account.profile': 'Profil',
    'account.updateProfile': 'Profil aktualisieren',
    
    // Errors
    'error.notFound': 'Seite nicht gefunden',
    'error.forbidden': 'Kein Zugriff',
    'error.returnHome': 'Zurück zur Startseite',
    
    // Share
    'share.section': 'Bereich teilen',
    'share.copied': 'Link in die Zwischenablage kopiert!',
    
    // Page errors
    'page.accessDenied': 'Kein Zugriff auf die Seite',
    'page.contactAdmin': 'Diese Seite ist nur für Benutzer mit entsprechenden Berechtigungen verfügbar. Wenden Sie sich an den Administrator, um Zugriff zu erhalten.',
    'page.noContent': 'Diese Seite hat noch keinen Inhalt',
    'page.contentSoon': 'Inhalte werden bald hinzugefügt.',
    'page.back': 'Zurück',
    
    // Messages
    'messages.accountBlocked': 'Konto gesperrt',
    'messages.accountDeactivated': 'Ihr Konto wurde vom Administrator deaktiviert. Sie haben keinen Zugriff auf die Anwendungsfunktionen.',
    'messages.contactAdminError': 'Wenn Sie glauben, dass dies ein Fehler ist, wenden Sie sich an den Systemadministrator.',
    'messages.welcomeBack': 'Willkommen im Pure Life System!',
    'messages.loginSuccess': 'Erfolgreich angemeldet',
    'messages.passwordChanged': 'Passwort erfolgreich geändert.',
    'messages.passwordError': 'Passwort konnte nicht geändert werden.',
  },
  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.admin': 'CMS Panel',
    'nav.myAccount': 'My Account',
    'nav.login': 'Sign In',
    'nav.logout': 'Sign Out',
    
    // Auth
    'auth.signIn': 'Sign In',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.confirmPassword': 'Confirm Password',
    'auth.signUp': 'Sign Up',
    'auth.signUpLink': "Don't have an account? Sign up",
    'auth.signInLink': 'Already have an account? Sign in',
    'auth.resetPassword': 'Reset Password',
    'auth.resetPasswordLink': 'Forgot your password?',
    
    // Admin Panel
    'admin.title': 'Administration Panel',
    'admin.cmsManagement': 'Content Management',
    'admin.sections': 'Sections',
    'admin.pages': 'Pages',
    'admin.userManagement': 'User Management',
    'admin.addSection': 'Add Section',
    'admin.addPage': 'Add Page',
    'admin.sectionTitle': 'Section Title',
    'admin.pageTitle': 'Page Title',
    'admin.slug': 'Slug',
    'admin.content': 'Content',
    'admin.save': 'Save',
    'admin.cancel': 'Cancel',
    'admin.edit': 'Edit',
    'admin.delete': 'Delete',
    'admin.active': 'Active',
    'admin.inactive': 'Inactive',
    'admin.visibleToPartners': 'Visible to Partners',
    'admin.visibleToClients': 'Visible to Clients',
    'admin.visibleToEveryone': 'Visible to Everyone',
    'admin.published': 'Published',
    'admin.unpublished': 'Unpublished',
    'admin.contentManagement': 'Content Management',
    'admin.fonts': 'Fonts',
    'admin.colors': 'Colors',
    'admin.textEditor': 'Text Editor',
    'admin.account': 'Account',
    'admin.users': 'Users',
    'admin.sectionManagement': 'Section Management',
    'admin.addItem': 'Add Item',
    'admin.moveUp': 'Move Up',
    'admin.moveDown': 'Move Down',
    'admin.itemType': 'Item Type',
    'admin.itemTitle': 'Item Title',
    'admin.description': 'Description',
    'admin.url': 'URL',
    'admin.icon': 'Icon',
    'admin.media': 'Media',
    'admin.altText': 'Alt Text',
    'admin.uploadMedia': 'Upload Media',
    'admin.formatting': 'Formatting',
    'admin.textFormatting': 'Text Formatting',
    'admin.titleFormatting': 'Title Formatting',
    'admin.metaTitle': 'Meta Title',
    'admin.metaDescription': 'Meta Description',
    'admin.pagePosition': 'Page Position',
    'admin.pageVisibility': 'Page Visibility',
    'admin.userRole': 'User Role',
    'admin.userEmail': 'User Email',
    'admin.userStatus': 'User Status',
    'admin.confirmationSent': 'Confirmation Sent',
    'admin.emailConfirmed': 'Email Confirmed',
    'admin.created': 'Created',
    'admin.updated': 'Updated',
    'admin.exportUsers': 'Export Users',
    'admin.inviteUser': 'Invite User',
    'admin.loadingUsers': 'Loading users...',
    'admin.loadingPages': 'Loading pages...',
    'admin.noUsers': 'No users',
    'admin.noPages': 'No pages',
    'admin.noSections': 'No sections',
    'admin.noItems': 'No items in this section',
    
    // Common
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.close': 'Close',
    'common.share': 'Share',
    'common.noContent': 'No content',
    'common.position': 'Position',
    
    // Account
    'account.myAccount': 'My Account',
    'account.profile': 'Profile',
    'account.updateProfile': 'Update Profile',
    
    // Errors
    'error.notFound': 'Page not found',
    'error.forbidden': 'Access denied',
    'error.returnHome': 'Return to Home',
    
    // Share
    'share.section': 'Share section',
    'share.copied': 'Link copied to clipboard!',
    
    // Page errors
    'page.accessDenied': 'Access denied to page',
    'page.contactAdmin': 'This page is available only for users with appropriate permissions. Contact the administrator to gain access.',
    'page.noContent': 'This page has no content yet',
    'page.contentSoon': 'Content will be added soon.',
    'page.back': 'Back',
    
    // Messages
    'messages.accountBlocked': 'Account blocked',
    'messages.accountDeactivated': 'Your account has been deactivated by the administrator. You do not have access to application functions.',
    'messages.contactAdminError': 'If you believe this is an error, contact the system administrator.',
    'messages.welcomeBack': 'Welcome to the Pure Life system!',
    'messages.loginSuccess': 'Successfully logged in',
    'messages.passwordChanged': 'Password changed successfully.',
    'messages.passwordError': 'Failed to change password.',
  }
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('pure-life-language');
    return (saved as Language) || 'pl';
  });

  useEffect(() => {
    localStorage.setItem('pure-life-language', language);
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};