import { CMSSection, CMSItem } from '@/types/cms';
import { User } from '@supabase/supabase-js';

interface VisibilityFields {
  visible_to_everyone?: boolean;
  visible_to_clients?: boolean;
  visible_to_partners?: boolean;
  visible_to_specjalista?: boolean;
  visible_to_anonymous?: boolean;
}

/**
 * Generyczna funkcja sprawdzająca widoczność na podstawie pól visible_to_*
 */
const checkVisibility = (
  entity: VisibilityFields,
  user: User | null,
  userRole: string | null
): boolean => {
  // Jeśli widoczne dla wszystkich - pokaż
  if (entity.visible_to_everyone) return true;
  
  // Jeśli visible_to_anonymous i użytkownik NIE jest zalogowany - pokaż
  if (entity.visible_to_anonymous && !user) return true;
  
  // Jeśli użytkownik jest zalogowany, sprawdź role
  if (user && userRole) {
    // Admin widzi wszystko
    if (userRole === 'admin') return true;
    
    if (entity.visible_to_clients && (userRole === 'client' || userRole === 'user')) return true;
    if (entity.visible_to_partners && userRole === 'partner') return true;
    if (entity.visible_to_specjalista && userRole === 'specjalista') return true;
  }
  
  return false;
};

/**
 * Sprawdza czy sekcja powinna być widoczna dla danego użytkownika
 */
export const isSectionVisible = (
  section: CMSSection, 
  user: User | null, 
  userRole: string | null
): boolean => {
  return checkVisibility(section, user, userRole);
};

/**
 * Sprawdza czy element powinna być widoczny dla danego użytkownika
 */
export const isItemVisible = (
  item: CMSItem, 
  user: User | null, 
  userRole: string | null
): boolean => {
  // Domyślnie element jest widoczny dla wszystkich (dla wstecznej kompatybilności)
  if (item.visible_to_everyone === undefined) return true;
  return checkVisibility(item, user, userRole);
};
