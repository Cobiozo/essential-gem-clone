import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';

interface HeroSectionProps {
  headerImage: string;
  headerText: string;
  authorText: string;
  showLoginButton?: boolean;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  headerImage,
  headerText,
  authorText,
  showLoginButton = false,
}) => {
  const scrollToContent = () => {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <section className="relative py-16 sm:py-20 md:py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
          {/* Logo */}
          <div className="flex justify-center mb-4 sm:mb-6">
            <img 
              src={headerImage} 
              alt="Pure Life" 
              className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 object-contain"
            />
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground tracking-tight uppercase px-4">
            WITAMY
          </h1>

          {/* Description */}
          {headerText ? (
            <div 
              className="text-xs sm:text-sm md:text-base text-muted-foreground max-w-3xl mx-auto leading-relaxed px-4"
              dangerouslySetInnerHTML={{ __html: headerText }}
            />
          ) : (
            <p className="text-xs sm:text-sm md:text-base text-muted-foreground max-w-3xl mx-auto leading-relaxed px-4">
              Cieszymy się, że możesz dołączyć do zespołu Pure Life. Tutaj znajdziesz wszystkie potrzebne informacje, 
              narzędzia i materiały edukacyjne. Poniżej znajdziesz odpowiednie sekcje z zasobami oraz szkoleniami. 
              Życzymy owocnej pracy!
            </p>
          )}

          {/* Author */}
          {authorText && (
            <div 
              className="text-xs sm:text-sm text-muted-foreground/80 px-4"
              dangerouslySetInnerHTML={{ __html: authorText }}
            />
          )}
        </div>
      </div>
    </section>
  );
};
