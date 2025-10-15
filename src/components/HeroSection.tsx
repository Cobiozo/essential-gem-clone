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
    <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img 
              src={headerImage} 
              alt="Pure Life" 
              className="w-32 h-32 sm:w-40 sm:h-40 object-contain"
            />
          </div>

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-primary tracking-tight">
            PURE LIFE
          </h1>

          {/* Description */}
          {headerText ? (
            <div 
              className="text-base sm:text-lg lg:text-xl text-foreground/80 max-w-2xl mx-auto leading-relaxed"
              dangerouslySetInnerHTML={{ __html: headerText }}
            />
          ) : (
            <p className="text-base sm:text-lg lg:text-xl text-foreground/80 max-w-2xl mx-auto leading-relaxed">
              Witaj, Pure Life to przestrzeń stworzona z myślą o Tobie i Twojej codziennej pracy w zespole Pure Life. 
              Tu znajdziesz materiały oraz zasoby, które pomogą Ci być skutecznym profesjonalistą i lekarstwem.
            </p>
          )}

          {/* Author */}
          {authorText ? (
            <div 
              className="text-sm text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: authorText }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Pozdrawiamy - Zespół Pure Life
            </p>
          )}

          {/* CTA Button */}
          {showLoginButton && (
            <div className="pt-4">
              <Button 
                size="lg"
                className="px-8 py-6 text-base"
                onClick={scrollToContent}
              >
                Zaloguj się
              </Button>
            </div>
          )}

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
            <button 
              onClick={scrollToContent}
              className="p-2 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
              aria-label="Scroll to content"
            >
              <ChevronDown className="w-6 h-6 text-primary" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
