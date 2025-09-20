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