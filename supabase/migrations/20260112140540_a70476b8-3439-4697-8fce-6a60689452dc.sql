INSERT INTO i18n_translations (language_code, namespace, key, value)
VALUES 
  -- Polish (pl)
  ('pl', 'common', 'dashboard.quickStats', 'Szybkie statystyki'),
  ('pl', 'common', 'dashboard.stats.educationalProgress', 'Postęp edukacyjny'),
  ('pl', 'common', 'dashboard.stats.modules', 'modułów'),
  ('pl', 'common', 'dashboard.stats.nextStep', 'Następny krok'),
  ('pl', 'common', 'dashboard.stats.network', 'Rozwój sieci'),
  ('pl', 'common', 'dashboard.stats.lastLogin', 'Ostatnie logowanie'),
  ('pl', 'common', 'dashboard.stats.actions', 'Wymagane działania'),
  ('pl', 'common', 'dashboard.stats.pendingApprovals', 'Oczekujące zatwierdzenia'),
  ('pl', 'common', 'dashboard.stats.newMaterials', 'Nowe materiały'),
  ('pl', 'common', 'dashboard.stats.unreadNotifications', 'Nieprzeczytane powiadomienia'),
  ('pl', 'common', 'dashboard.stats.never', 'nigdy'),
  ('pl', 'common', 'dashboard.stats.recently', 'niedawno'),
  
  -- German (de)
  ('de', 'common', 'dashboard.quickStats', 'Schnelle Statistiken'),
  ('de', 'common', 'dashboard.stats.educationalProgress', 'Bildungsfortschritt'),
  ('de', 'common', 'dashboard.stats.modules', 'Module'),
  ('de', 'common', 'dashboard.stats.nextStep', 'Nächster Schritt'),
  ('de', 'common', 'dashboard.stats.network', 'Netzwerkentwicklung'),
  ('de', 'common', 'dashboard.stats.lastLogin', 'Letzte Anmeldung'),
  ('de', 'common', 'dashboard.stats.actions', 'Erforderliche Aktionen'),
  ('de', 'common', 'dashboard.stats.pendingApprovals', 'Ausstehende Genehmigungen'),
  ('de', 'common', 'dashboard.stats.newMaterials', 'Neue Materialien'),
  ('de', 'common', 'dashboard.stats.unreadNotifications', 'Ungelesene Benachrichtigungen'),
  ('de', 'common', 'dashboard.stats.never', 'nie'),
  ('de', 'common', 'dashboard.stats.recently', 'kürzlich'),
  
  -- English (en)
  ('en', 'common', 'dashboard.quickStats', 'Quick Stats'),
  ('en', 'common', 'dashboard.stats.educationalProgress', 'Educational Progress'),
  ('en', 'common', 'dashboard.stats.modules', 'modules'),
  ('en', 'common', 'dashboard.stats.nextStep', 'Next step'),
  ('en', 'common', 'dashboard.stats.network', 'Network'),
  ('en', 'common', 'dashboard.stats.lastLogin', 'Last login'),
  ('en', 'common', 'dashboard.stats.actions', 'Actions required'),
  ('en', 'common', 'dashboard.stats.pendingApprovals', 'Pending approvals'),
  ('en', 'common', 'dashboard.stats.newMaterials', 'New materials'),
  ('en', 'common', 'dashboard.stats.unreadNotifications', 'Unread notifications'),
  ('en', 'common', 'dashboard.stats.never', 'never'),
  ('en', 'common', 'dashboard.stats.recently', 'recently')
ON CONFLICT (language_code, namespace, key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();