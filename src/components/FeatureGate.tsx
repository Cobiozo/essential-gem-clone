import React from 'react';
import { useFeatureVisibility } from '@/hooks/useFeatureVisibility';

interface FeatureGateProps {
  featureKey: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * FeatureGate - Komponent warunkowego renderowania oparty o uprawnienia ról.
 * 
 * Jeśli funkcja jest wyłączona dla danej roli użytkownika:
 * - NIE renderuje nic
 * - NIE tworzy elementu DOM
 * - NIE pokazuje komunikatów o braku dostępu
 * 
 * Dla tej roli element → NIE ISTNIEJE.
 * 
 * @param featureKey - Klucz funkcji do sprawdzenia (np. 'menu.training')
 * @param children - Zawartość do wyrenderowania jeśli funkcja jest dostępna
 * @param fallback - Opcjonalna zawartość zastępcza (domyślnie: null)
 */
export const FeatureGate: React.FC<FeatureGateProps> = ({ 
  featureKey, 
  children, 
  fallback = null 
}) => {
  const { isVisible, isLoading } = useFeatureVisibility();

  // During loading, don't render anything to prevent flicker
  if (isLoading) return null;

  // If not visible for this role, don't render anything
  if (!isVisible(featureKey)) return <>{fallback}</>;

  return <>{children}</>;
};

// HOC version for wrapping entire components
export function withFeatureGate<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  featureKey: string
) {
  return function FeatureGatedComponent(props: P) {
    const { isVisible, isLoading } = useFeatureVisibility();

    if (isLoading) return null;
    if (!isVisible(featureKey)) return null;

    return <WrappedComponent {...props} />;
  };
}

export default FeatureGate;
