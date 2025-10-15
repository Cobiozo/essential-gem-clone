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
    <section className="relative py-20 sm:py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img 
              src={headerImage} 
              alt="Pure Life" 
              className="w-24 h-24 sm:w-32 sm:h-32 object-contain"
            />
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight uppercase">
            WITAMY
          </h1>

          {/* Description */}
          {headerText ? (
            <div 
              className="text-sm sm:text-base text-muted-foreground max-w-3xl mx-auto leading-relaxed"
              dangerouslySetInnerHTML={{ __html: headerText }}
            />
          ) : (
            <p className="text-sm sm:text-base text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Cieszymy się, że możesz dołączyć do zespołu Pure Life. Tutaj znajdziesz wszystkie potrzebne informacje, 
              narzędzia i materiały edukacyjne. Poniżej znajdziesz odpowiednie sekcje z zasobami oraz szkoleniami. 
              Życzymy owocnej pracy!
            </p>
          )}

          {/* Author */}
          {authorText && (
            <div 
              className="text-xs sm:text-sm text-muted-foreground/80"
              dangerouslySetInnerHTML={{ __html: authorText }}
            />
          )}
        </div>
      </div>
    </section>
  );
};
