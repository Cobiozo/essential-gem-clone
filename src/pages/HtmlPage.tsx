import React, { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/components/ThemeProvider';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Header } from '@/components/Header';
import { sanitizeHtmlForDarkMode } from '@/lib/colorUtils';
import { ShieldX, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LanguageSelector } from '@/components/LanguageSelector';
import { ThemeSelector } from '@/components/ThemeSelector';

interface HtmlPage {
  id: string;
  title: string;
  slug: string;
  html_content: string;
  meta_title: string | null;
  meta_description: string | null;
  show_header: boolean;
  show_footer: boolean;
  custom_css: string | null;
}

const HtmlPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme } = useTheme();
  
  const isDarkMode = theme === 'dark' || 
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const { data: page, isLoading, error } = useQuery({
    queryKey: ['html-page', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('html_pages')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .eq('is_published', true)
        .single();

      if (error) throw error;
      return data as HtmlPage;
    },
    enabled: !!slug,
  });

  // Set meta tags
  useEffect(() => {
    if (page) {
      document.title = page.meta_title || page.title || 'Strona';
      
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription && page.meta_description) {
        metaDescription.setAttribute('content', page.meta_description);
      }
    }
    
    return () => {
      document.title = 'PureLife';
    };
  }, [page]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <ShieldX className="w-16 h-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Strona niedostępna
        </h1>
        <p className="text-muted-foreground text-center mb-6">
          Ta strona nie istnieje lub nie masz do niej dostępu.
        </p>
        <Button onClick={() => navigate(-1)} variant="outline">
          Wróć
        </Button>
      </div>
    );
  }

  // Sanitize HTML for dark mode
  const sanitizedHtml = isDarkMode 
    ? sanitizeHtmlForDarkMode(page.html_content, true)
    : page.html_content;

  return (
    <div className="min-h-screen bg-background relative">
      {/* Language & Theme Selector */}
      <div className="fixed top-2 sm:top-4 right-2 sm:right-4 z-50 flex items-center gap-1 sm:gap-2">
        <LanguageSelector />
        <ThemeSelector />
      </div>
      
      {/* Navigation Header */}
      {page.show_header && (
        <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              <Button variant="ghost" asChild size="sm" className="h-8 sm:h-9">
                <Link to="/">
                  <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="text-xs sm:text-sm">Strona główna</span>
                </Link>
              </Button>
              <h1 className="text-sm sm:text-base font-semibold text-foreground">{page.title}</h1>
              <div className="w-24" /> {/* Spacer for centering */}
            </div>
          </div>
        </nav>
      )}
      
      <main className="html-page-container">
        {/* Custom CSS */}
        {page.custom_css && (
          <style dangerouslySetInnerHTML={{ __html: page.custom_css }} />
        )}
        
        {/* Main HTML Content */}
        <div 
          className="html-page-content prose dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
      </main>
      
      {page.show_footer && (
        <footer className="bg-muted py-8 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} PureLife. Wszelkie prawa zastrzeżone.</p>
        </footer>
      )}
    </div>
  );
};

export default HtmlPage;
