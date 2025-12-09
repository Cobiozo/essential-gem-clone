import { CMSSection } from '@/types/cms';
import { User } from '@supabase/supabase-js';

/**
 * Sprawdza czy sekcja powinna być widoczna dla danego użytkownika
 */
export const isSectionVisible = (
  section: CMSSection, 
  user: User | null, 
  userRole: string | null
): boolean => {
  // Jeśli widoczne dla wszystkich - pokaż
  if (section.visible_to_everyone) return true;
  
  // Jeśli visible_to_anonymous i użytkownik NIE jest zalogowany - pokaż
  if (section.visible_to_anonymous && !user) return true;
  
  // Jeśli użytkownik jest zalogowany, sprawdź role
  if (user && userRole) {
    // Admin widzi wszystko
    if (userRole === 'admin') return true;
    
    if (section.visible_to_clients && (userRole === 'client' || userRole === 'user')) return true;
    if (section.visible_to_partners && userRole === 'partner') return true;
    if (section.visible_to_specjalista && userRole === 'specjalista') return true;
  }
  
  return false;
};
