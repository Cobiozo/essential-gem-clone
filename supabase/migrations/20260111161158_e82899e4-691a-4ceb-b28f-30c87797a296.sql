-- Add dashboard translations for Polish (pl)
INSERT INTO i18n_translations (language_code, namespace, key, value)
VALUES 
  -- Menu navigation
  ('pl', 'dashboard', 'menu.dashboard', 'Pulpit'),
  ('pl', 'dashboard', 'menu.academy', 'Akademia'),
  ('pl', 'dashboard', 'menu.resources', 'Zasoby'),
  ('pl', 'dashboard', 'menu.team', 'Członkowie zespołu'),
  ('pl', 'dashboard', 'menu.news', 'Aktualności'),
  ('pl', 'dashboard', 'menu.calendar', 'Terminarz'),
  ('pl', 'dashboard', 'menu.chat', 'Czat'),
  ('pl', 'dashboard', 'menu.support', 'Wsparcie i Pomoc'),
  ('pl', 'dashboard', 'menu.reflinks', 'Twoje Linki'),
  ('pl', 'dashboard', 'menu.settings', 'Ustawienia'),
  ('pl', 'dashboard', 'menu.aiCompass', 'AI Kompas'),
  
  -- Greetings
  ('pl', 'dashboard', 'greeting.morning', 'Dzień dobry'),
  ('pl', 'dashboard', 'greeting.afternoon', 'Dzień dobry'),
  ('pl', 'dashboard', 'greeting.evening', 'Dobry wieczór'),
  
  -- Quick stats widget
  ('pl', 'dashboard', 'quickStats', 'Szybkie statystyki'),
  ('pl', 'dashboard', 'overallProgress', 'Postęp ogólny'),
  ('pl', 'dashboard', 'stats.completedModules', 'Ukończone moduły'),
  ('pl', 'dashboard', 'stats.progress', 'Postęp'),
  ('pl', 'dashboard', 'stats.notifications', 'Powiadomienia'),
  
  -- Training progress widget
  ('pl', 'dashboard', 'trainingProgress', 'Postęp szkoleń'),
  ('pl', 'dashboard', 'viewAll', 'Zobacz wszystkie'),
  ('pl', 'dashboard', 'noModulesAvailable', 'Brak dostępnych modułów'),
  ('pl', 'dashboard', 'completed', 'Ukończone'),
  ('pl', 'dashboard', 'continueTraining', 'Kontynuuj naukę'),
  
  -- Resources widget
  ('pl', 'dashboard', 'latestResources', 'Najnowsze zasoby'),
  ('pl', 'dashboard', 'noResourcesAvailable', 'Brak dostępnych zasobów'),
  ('pl', 'dashboard', 'new', 'Nowe'),
  
  -- Notifications widget
  ('pl', 'dashboard', 'notifications', 'Powiadomienia'),
  ('pl', 'dashboard', 'noNotifications', 'Brak powiadomień'),
  
  -- Team contacts widget
  ('pl', 'dashboard', 'teamContacts', 'Członkowie zespołu'),
  ('pl', 'dashboard', 'manage', 'Zarządzaj'),
  ('pl', 'dashboard', 'totalContacts', 'Łączna liczba kontaktów'),
  ('pl', 'dashboard', 'noTeamMembers', 'Brak członków zespołu'),
  ('pl', 'dashboard', 'recentlyAdded', 'Ostatnio dodani'),
  
  -- Reflinks widget
  ('pl', 'dashboard', 'reflinks', 'Linki polecające'),
  ('pl', 'dashboard', 'totalClicks', 'Łączne kliknięcia'),
  ('pl', 'dashboard', 'activeLinks', 'Aktywne linki'),
  
  -- Placeholders and switcher
  ('pl', 'dashboard', 'comingSoon', 'Wkrótce dostępne'),
  ('pl', 'dashboard', 'workingOnFeature', 'Pracujemy nad tą funkcją'),
  ('pl', 'dashboard', 'switchToClassic', 'Klasyczny widok'),
  ('pl', 'dashboard', 'switchToModern', 'Nowy panel'),
  ('pl', 'dashboard', 'newDashboard', 'Nowy Panel')
ON CONFLICT (language_code, namespace, key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- Add dashboard translations for English (en)
INSERT INTO i18n_translations (language_code, namespace, key, value)
VALUES 
  -- Menu navigation
  ('en', 'dashboard', 'menu.dashboard', 'Dashboard'),
  ('en', 'dashboard', 'menu.academy', 'Academy'),
  ('en', 'dashboard', 'menu.resources', 'Resources'),
  ('en', 'dashboard', 'menu.team', 'Team Members'),
  ('en', 'dashboard', 'menu.news', 'News'),
  ('en', 'dashboard', 'menu.calendar', 'Calendar'),
  ('en', 'dashboard', 'menu.chat', 'Chat'),
  ('en', 'dashboard', 'menu.support', 'Support and Help'),
  ('en', 'dashboard', 'menu.reflinks', 'Your Links'),
  ('en', 'dashboard', 'menu.settings', 'Settings'),
  ('en', 'dashboard', 'menu.aiCompass', 'AI Compass'),
  
  -- Greetings
  ('en', 'dashboard', 'greeting.morning', 'Good morning'),
  ('en', 'dashboard', 'greeting.afternoon', 'Good afternoon'),
  ('en', 'dashboard', 'greeting.evening', 'Good evening'),
  
  -- Quick stats widget
  ('en', 'dashboard', 'quickStats', 'Quick Stats'),
  ('en', 'dashboard', 'overallProgress', 'Overall Progress'),
  ('en', 'dashboard', 'stats.completedModules', 'Completed Modules'),
  ('en', 'dashboard', 'stats.progress', 'Progress'),
  ('en', 'dashboard', 'stats.notifications', 'Notifications'),
  
  -- Training progress widget
  ('en', 'dashboard', 'trainingProgress', 'Training Progress'),
  ('en', 'dashboard', 'viewAll', 'View All'),
  ('en', 'dashboard', 'noModulesAvailable', 'No modules available'),
  ('en', 'dashboard', 'completed', 'Completed'),
  ('en', 'dashboard', 'continueTraining', 'Continue Training'),
  
  -- Resources widget
  ('en', 'dashboard', 'latestResources', 'Latest Resources'),
  ('en', 'dashboard', 'noResourcesAvailable', 'No resources available'),
  ('en', 'dashboard', 'new', 'New'),
  
  -- Notifications widget
  ('en', 'dashboard', 'notifications', 'Notifications'),
  ('en', 'dashboard', 'noNotifications', 'No notifications'),
  
  -- Team contacts widget
  ('en', 'dashboard', 'teamContacts', 'Team Contacts'),
  ('en', 'dashboard', 'manage', 'Manage'),
  ('en', 'dashboard', 'totalContacts', 'Total Contacts'),
  ('en', 'dashboard', 'noTeamMembers', 'No team members'),
  ('en', 'dashboard', 'recentlyAdded', 'Recently Added'),
  
  -- Reflinks widget
  ('en', 'dashboard', 'reflinks', 'Referral Links'),
  ('en', 'dashboard', 'totalClicks', 'Total Clicks'),
  ('en', 'dashboard', 'activeLinks', 'Active Links'),
  
  -- Placeholders and switcher
  ('en', 'dashboard', 'comingSoon', 'Coming Soon'),
  ('en', 'dashboard', 'workingOnFeature', 'We are working on this feature'),
  ('en', 'dashboard', 'switchToClassic', 'Classic View'),
  ('en', 'dashboard', 'switchToModern', 'New Dashboard'),
  ('en', 'dashboard', 'newDashboard', 'New Dashboard')
ON CONFLICT (language_code, namespace, key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();