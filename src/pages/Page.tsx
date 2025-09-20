import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Home, ArrowLeft } from 'lucide-react';
import { ThemeSelector } from '@/components/ThemeSelector';
import { CMSContent } from '@/components/CMSContent';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSelector } from '@/components/LanguageSelector';
import newPureLifeLogo from '@/assets/pure-life-logo-new.png';

interface CMSSection {
  id: string;
  title: string;
  position: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  page_id?: string;
  // Enhanced styling options
  background_color?: string | null;
  text_color?: string | null;
  font_size?: number | null;
  alignment?: string | null;
  padding?: number | null;
  margin?: number | null;
  border_radius?: number | null;
  style_class?: string | null;
  background_gradient?: string | null;
  border_width?: number | null;
  border_color?: string | null;
  border_style?: string | null;
  box_shadow?: string | null;
  opacity?: number | null;
  width_type?: string | null;
  custom_width?: number | null;
  height_type?: string | null;
  custom_height?: number | null;
  max_width?: number | null;
  font_weight?: number | null;
  line_height?: number | null;
  letter_spacing?: number | null;
  text_transform?: string | null;
  display_type?: string | null;
  justify_content?: string | null;
  align_items?: string | null;
  gap?: number | null;
}

interface CMSItem {
  id: string;
  section_id: string;
  type: string;
  title: string | null;
  description: string | null;
  url: string | null;
  icon: string | null;
  position: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  media_url?: string | null;
  media_type?: string | null;
  media_alt_text?: string | null;
  text_formatting?: any;
  title_formatting?: any;
  page_id?: string;
}

interface Page {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  content_formatting: any | null;
  meta_title: string | null;
  meta_description: string | null;
  is_published: boolean;
  is_active: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

const PageComponent = () => {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [page, setPage] = useState<Page | null>(null);
  const [sections, setSections] = useState<CMSSection[]>([]);
  const [items, setItems] = useState<CMSItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchPageData = async () => {
      try {
        if (!slug) {
          setNotFound(true);
          return;
        }

        // Fetch page data
        const { data: pageData, error: pageError } = await supabase
          .from('pages')
          .select('*')
          .eq('slug', slug)
          .maybeSingle();

        if (pageError) {
          console.error('Error fetching page:', pageError);
          toast({
            title: "Błąd",
            description: "Nie udało się załadować strony.",
            variant: "destructive",
          });
          setNotFound(true);
          return;
        }

        if (!pageData) {
          setNotFound(true);
          return;
        }

        setPage(pageData);

        // Update document title and meta description
        if (pageData.meta_title) {
          document.title = pageData.meta_title;
        } else {
          document.title = pageData.title;
        }

        if (pageData.meta_description) {
          const metaDescription = document.querySelector('meta[name="description"]');
          if (metaDescription) {
            metaDescription.setAttribute('content', pageData.meta_description);
          } else {
            const meta = document.createElement('meta');
            meta.name = 'description';
            meta.content = pageData.meta_description;
            document.head.appendChild(meta);
          }
        }

        // Fetch CMS sections for this page
        const { data: sectionsData, error: sectionsError } = await supabase
          .from('cms_sections')
          .select('*')
          .eq('page_id', pageData.id)
          .eq('is_active', true)
          .order('position', { ascending: true });

        if (sectionsError) {
          console.error('Error fetching page sections:', sectionsError);
        } else {
          setSections(sectionsData || []);
        }

        // Fetch CMS items for this page
        const { data: itemsData, error: itemsError } = await supabase
          .from('cms_items')
          .select('*')
          .eq('page_id', pageData.id)
          .eq('is_active', true)
          .order('position', { ascending: true });

        if (itemsError) {
          console.error('Error fetching page items:', itemsError);
        } else {
          setItems(itemsData || []);
        }

      } catch (error) {
        console.error('Error fetching page data:', error);
        toast({
          title: "Błąd",
          description: "Nie udało się załadować strony.",
          variant: "destructive",
        });
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchPageData();
  }, [slug, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('common.loading')}...</p>
        </div>
      </div>
    );
  }

  if (notFound || !page) {
    return (
      <div className="min-h-screen bg-background relative">
        {/* Theme Selector */}
        <div className="fixed top-4 right-4 z-50">
          <ThemeSelector />
        </div>
        
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-foreground mb-4">403</h1>
              <h2 className="text-2xl font-semibold text-foreground mb-4">{t('error.forbidden')}</h2>
              <p className="text-muted-foreground mb-8">
                Ta strona jest dostępna tylko dla użytkowników z odpowiednimi uprawnieniami. 
                Skontaktuj się z administratorem aby uzyskać dostęp.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild>
                <Link to="/">
                  <Home className="w-4 h-4 mr-2" />
                  {t('nav.home')}
                </Link>
              </Button>
              <Button variant="outline" onClick={() => window.history.back()}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Wstecz
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      {/* Language & Theme Selector */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        <LanguageSelector />
        <ThemeSelector />
      </div>
      
      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" asChild>
              <Link to="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('nav.home')}
              </Link>
            </Button>
            
            <h1 className="text-lg font-semibold text-foreground truncate mx-4">
              {page.title}
            </h1>
            
            <div className="w-[120px]"></div> {/* Spacer for layout balance */}
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
        {/* Page Header */}
        <div className="text-center mb-8">
          <img src={newPureLifeLogo} alt="Pure Life" className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4" />
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
            {page.title}
          </h1>
          {page.meta_description && (
            <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-3xl mx-auto">
              {page.meta_description}
            </p>
          )}
        </div>

        {/* CMS Content */}
        {sections.length > 0 && (
          <div className="space-y-6 sm:space-y-8">
            {sections.map((section) => (
              <CollapsibleSection 
                key={section.id} 
                title={section.title} 
                className="mb-6 sm:mb-8"
                sectionStyle={section}
              >
                <div className="space-y-3 sm:space-y-4">
                  {items
                    .filter(item => item.section_id === section.id)
                    .map((item) => (
                      <CMSContent key={item.id} item={item} />
                    ))}
                  {items.filter(item => item.section_id === section.id).length === 0 && (
                    <div className="text-center text-muted-foreground py-4 sm:py-6 text-xs sm:text-sm">
                      {t('common.noContent')}
                    </div>
                  )}
                </div>
              </CollapsibleSection>
            ))}
          </div>
        )}

        {/* Fallback HTML content if no CMS sections */}
        {sections.length === 0 && page.content && (
          <Card>
            <CardContent className="p-6 sm:p-8">
              <div
                className={
                  page.content_formatting ? 
                  "formatted-content" : 
                  "prose prose-lg max-w-none text-foreground prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-em:text-foreground prose-code:text-foreground prose-pre:bg-muted prose-blockquote:text-muted-foreground prose-blockquote:border-border prose-hr:border-border prose-th:text-foreground prose-td:text-foreground prose-a:text-primary prose-a:no-underline hover:prose-a:underline"
                }
                style={page.content_formatting || undefined}
                dangerouslySetInnerHTML={{ __html: page.content }}
              />
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {sections.length === 0 && !page.content && (
          <div className="text-center py-12">
            <img src={newPureLifeLogo} alt="Pure Life" className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">Ta strona nie ma jeszcze zawartości</p>
            <p className="text-muted-foreground">
              Zawartość zostanie dodana wkrótce.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default PageComponent;