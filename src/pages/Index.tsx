import React from 'react';
import { Link } from 'react-router-dom';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { CMSContent } from '@/components/CMSContent';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useSecurityPreventions } from '@/hooks/useSecurityPreventions';
import { useLanguage } from '@/contexts/LanguageContext';
import { isExternalUrl } from '@/lib/urlUtils';
import newPureLifeLogo from '@/assets/pure-life-logo-new.png';
import niezbednikLogo from '@/assets/logo-niezbednika-pure-life.png';
import { convertSupabaseSections } from '@/lib/typeUtils';
import { ColumnLayout } from '@/components/dnd/ColumnLayout';
import { useIsMobile } from '@/hooks/use-mobile';
import { Header } from '@/components/Header';
import { HeroSection } from '@/components/HeroSection';
import { IconCard } from '@/components/homepage/IconCard';
import { ExpandableListItem } from '@/components/homepage/ExpandableListItem';
import { SectionTitle } from '@/components/homepage/SectionTitle';

interface CMSSection {
  id: string;
  title: string;
  description?: string | null;
  position: number;
  is_active: boolean;
  visible_to_partners: boolean;
  visible_to_clients: boolean;
  visible_to_everyone: boolean;
  visible_to_specjalista: boolean;
  visible_to_anonymous: boolean;
  parent_id?: string | null;
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
  // New enhanced options
  section_margin_top?: number | null;
  section_margin_bottom?: number | null;
  background_image?: string | null;
  background_image_opacity?: number | null;
  background_image_position?: string | null;
  background_image_size?: string | null;
  icon_name?: string | null;
  icon_position?: string | null;
  icon_size?: number | null;
  icon_color?: string | null;
  show_icon?: boolean | null;
  content_direction?: string | null;
  content_wrap?: string | null;
  min_height?: number | null;
  overflow_behavior?: string | null;
  // Hover states
  hover_background_color?: string | null;
  hover_background_gradient?: string | null;
  hover_text_color?: string | null;
  hover_border_color?: string | null;
  hover_box_shadow?: string | null;
  hover_opacity?: number | null;
  hover_scale?: number | null;
  section_type?: string | null;
  row_column_count?: number | null;
  row_layout_type?: string | null;
  default_expanded?: boolean | null;
}

interface CMSItem {
  id: string;
  section_id: string;
  type: string;
  title: string | null;
  description: string | null;
  url: string | null;
  position: number;
  is_active: boolean;
  media_url?: string | null;
  media_type?: string | null;
  media_alt_text?: string | null;
  text_formatting?: any;
  title_formatting?: any;
  column_index?: number;
}

interface Column {
  id: string;
  items: CMSItem[];
  width?: number;
}

const Index = () => {
  const { user, isAdmin, isPartner, isClient, isSpecjalista, signOut } = useAuth();
  const { t } = useLanguage();
  const [sections, setSections] = React.useState<CMSSection[]>([]);
  const [items, setItems] = React.useState<CMSItem[]>([]);
  const [headerText, setHeaderText] = React.useState<string>('');
  const [authorText, setAuthorText] = React.useState<string>('');
  const [siteLogo, setSiteLogo] = React.useState<string>(newPureLifeLogo);
  const [headerImage, setHeaderImage] = React.useState<string>(niezbednikLogo);
  const [publishedPages, setPublishedPages] = React.useState<any[]>([]);
   const [loading, setLoading] = React.useState(true);
   const [sectionLayoutMode, setSectionLayoutMode] = React.useState<'single' | 'columns' | 'grid'>('single');
   const [sectionColumnCount, setSectionColumnCount] = React.useState<number>(1);
  
  // Enable security preventions
  useSecurityPreventions();
  const isMobile = useIsMobile();

  React.useEffect(() => {
    fetchCMSData();
  }, [user, isAdmin, isPartner, isClient, isSpecjalista]);

  // Realtime updates: odśwież widok strony głównej po zmianach w CMS
  React.useEffect(() => {
    const channel = supabase
      .channel('cms-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cms_items' }, () => {
        fetchCMSData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cms_sections' }, () => {
        fetchCMSData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'page_settings' }, () => {
        fetchCMSData();
      })
      .on('broadcast', { event: 'layout-updated' }, () => {
        fetchCMSData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchCMSData = async () => {
    try {
      // Build sections query with visibility for anonymous users
      let sectionsQuery = supabase
        .from('cms_sections')
        .select('*')
        .is('page_id', null)  // Tylko sekcje strony głównej
        .eq('is_active', true)
        .order('position');

      // Dla adminów - pokaż wszystkie aktywne sekcje
      // Dla pozostałych użytkowników - zastosuj filtry widoczności
      if (!user) {
        // Dla niezalogowanych użytkowników - pokaż sekcje widoczne dla wszystkich lub anonimowych
        sectionsQuery = sectionsQuery.or('visible_to_everyone.eq.true,visible_to_anonymous.eq.true');
      } else if (!isAdmin) {
        // Dla zalogowanych użytkowników (nie adminów) - polegaj na RLS policies
        // RLS policies już obsługują widoczność bazując na rolach
      }

      const { data: sectionsData } = await sectionsQuery;

      // Pobierz tylko elementy należące do strony głównej (page_id = null)
      const { data: itemsData } = await supabase
        .from('cms_items')
        .select('*, text_formatting, title_formatting')
        .is('page_id', null)  // Tylko elementy strony głównej
        .eq('is_active', true)
        .order('position');

      setSections(convertSupabaseSections(sectionsData || []));
      setItems(itemsData || []);

       // Pobierz ustawienia układu strony głównej (sekcje w gridzie)
       const { data: settings } = await supabase
         .from('page_settings')
         .select('layout_mode, column_count')
         .eq('page_type', 'homepage')
         .maybeSingle();
       if (settings) {
         setSectionLayoutMode((settings.layout_mode as any) || 'single');
         setSectionColumnCount(settings.column_count || 1);
       }
      
      // Pobierz teksty nagłówka, autora, logo i zdjęcie nagłówka z system_texts
      const { data: systemTexts } = await (supabase as any)
        .from('system_texts')
        .select('type, content, text_formatting')
        .eq('is_active', true)
        .in('type', ['header_text', 'author', 'site_logo', 'header_image']);
      
      const headerSystemText = systemTexts?.find((item: any) => item.type === 'header_text');
      const authorSystemText = systemTexts?.find((item: any) => item.type === 'author');
      const logoSystemText = systemTexts?.find((item: any) => item.type === 'site_logo');
      const headerImageSystemText = systemTexts?.find((item: any) => item.type === 'header_image');
      
      if (headerSystemText?.content) setHeaderText(headerSystemText.content);
      if (authorSystemText?.content) setAuthorText(authorSystemText.content);
      if (logoSystemText?.content) setSiteLogo(logoSystemText.content);
      if (headerImageSystemText?.content) setHeaderImage(headerImageSystemText.content);
      
      // Pobierz opublikowane strony
      let pagesQuery = supabase
        .from('pages')
        .select('id, title, slug, meta_description, created_at, visible_to_partners, visible_to_clients, visible_to_everyone')
        .eq('is_published', true)
        .eq('is_active', true)
        .order('position', { ascending: true });

      // Dla adminów - pokaż wszystkie opublikowane strony
      // Dla pozostałych użytkowników - zastosuj filtry widoczności
      if (!user) {
        pagesQuery = pagesQuery.eq('visible_to_everyone', true);
      } else if (!isAdmin) {
        // Dla zalogowanych użytkowników (nie adminów) - polegaj na RLS policies
      }

      const { data: pagesData } = await pagesQuery;
      
      setPublishedPages(pagesData || []);
      
    } catch (error) {
      console.error('Error fetching CMS data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleButtonClick = (buttonName: string, url?: string) => {
    console.log(`Clicked: ${buttonName}`);
    if (url) {
      if (isExternalUrl(url)) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        window.location.href = url;
      }
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <img src={siteLogo} alt="Pure Life" className="w-16 h-16 mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header Navigation */}
      <Header siteLogo={siteLogo} publishedPages={publishedPages} />

      {/* Hero Section */}
      <HeroSection 
        headerImage={headerImage || niezbednikLogo}
        headerText={headerText}
        authorText={authorText}
        showLoginButton={!user}
      />

      {/* Main Content */}
      <main id="main-content" className="py-12 sm:py-16 lg:py-20 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto space-y-16 sm:space-y-20">
            {sections.filter(s => !s.parent_id).map((section) => {
              // Handle row sections first
              if (section.section_type === 'row') {
                const rowColumnCount = section.row_column_count || 1;
                const childSections = sections.filter(s => s.parent_id === section.id)
                  .sort((a, b) => a.position - b.position);
                
                return (
                  <div key={`row-${section.id}`} className="w-full">
                    <div className="grid gap-4 lg:gap-6 w-full" style={{ gridTemplateColumns: `repeat(${rowColumnCount}, minmax(0, 1fr))` }}>
                      {Array.from({ length: rowColumnCount }, (_, colIndex) => {
                        const childSection = childSections[colIndex];
                        if (!childSection) return <div key={`row-${section.id}-col-${colIndex}`} />;
                        
                        const childItems = items
                          .filter(item => item.section_id === childSection.id && item.type !== 'header_text' && item.type !== 'author')
                          .sort((a, b) => a.position - b.position);
                        
                        const maxColIndex = childItems.reduce((max, item) => Math.max(max, item.column_index ?? 0), 0);
                        const columnCount = Math.max(1, maxColIndex + 1);
                        const columns: Column[] = Array.from({ length: columnCount }, (_, i) => ({
                          id: `${childSection.id}-col-${i}`,
                          items: [],
                          width: 100 / columnCount,
                        }));
                        childItems.forEach((item) => {
                          const ci = Math.min(columns.length - 1, Math.max(0, item.column_index || 0));
                          columns[ci].items.push(item);
                        });
                        
                        return (
                          <div key={`row-${section.id}-col-${colIndex}`}>
                            <CollapsibleSection
                              title={childSection.title}
                              description={childSection.description}
                              defaultOpen={childSection.default_expanded || false}
                              sectionStyle={childSection}
                              variant="modern"
                            >
                              <ColumnLayout
                                sectionId={childSection.id}
                                columns={columns}
                                isEditMode={false}
                                onColumnsChange={() => {}}
                                onItemClick={handleButtonClick}
                                onSelectItem={() => {}}
                              />
                            </CollapsibleSection>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }
              
              // Get section items for regular sections
              const sectionItems = items
                .filter(item => item.section_id === section.id && item.type !== 'header_text' && item.type !== 'author')
                .sort((a, b) => a.position - b.position);
              
              // Check section type by title for special styling
              const titleLower = section.title.toLowerCase();
              const isWelcome = titleLower.includes('witamy');
              const isTeam = titleLower.includes('zespół') || titleLower.includes('zesp');
              const isLearnMore = titleLower.includes('dowiedz');
              const isContact = titleLower.includes('kontakt');
              
              // Flat section (Welcome) - only if has items
              if (isWelcome && sectionItems.length > 0) {
                return (
                  <section key={section.id} className="text-center">
                    <SectionTitle title={section.title} subtitle={section.description || undefined} />
                    <div className="max-w-3xl mx-auto space-y-4">
                      {sectionItems.map((item) => (
                        <CMSContent key={item.id} item={item} onClick={handleButtonClick} />
                      ))}
                    </div>
                  </section>
                );
              }
              
              // Grid section (Team or Contact) - only if has items
              if ((isTeam || isContact) && sectionItems.length > 0) {
                return (
                  <section key={section.id}>
                    <SectionTitle title={section.title} subtitle={section.description || undefined} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {sectionItems.map((item) => (
                        <div key={item.id} onClick={() => handleButtonClick(item.title || '', item.url)}>
                          <IconCard title={item.title || ''} description={item.description || undefined} />
                        </div>
                      ))}
                    </div>
                  </section>
                );
              }
              
              // List section (Learn More) - only if has items
              if (isLearnMore && sectionItems.length > 0) {
                return (
                  <section key={section.id}>
                    <SectionTitle title={section.title} subtitle={section.description || undefined} />
                    <div className="max-w-2xl mx-auto space-y-3">
                      {sectionItems.map((item) => (
                        <ExpandableListItem
                          key={item.id}
                          title={item.title || ''}
                          onClick={() => handleButtonClick(item.title || '', item.url)}
                        />
                      ))}
                    </div>
                  </section>
                );
              }
              
              // Default: Collapsible section (for ALL other sections)
              const maxColIndex = sectionItems.reduce((max, item) => Math.max(max, item.column_index ?? 0), 0);
              const columnCount = Math.max(1, maxColIndex + 1);
              const columns: Column[] = Array.from({ length: columnCount }, (_, i) => ({
                id: `${section.id}-col-${i}`,
                items: [],
                width: 100 / columnCount,
              }));
              sectionItems.forEach((item) => {
                const colIndex = Math.min(columns.length - 1, Math.max(0, item.column_index || 0));
                columns[colIndex].items.push(item);
              });
              
              return (
                <CollapsibleSection
                  key={section.id}
                  title={section.title}
                  description={section.description}
                  defaultOpen={section.default_expanded || false}
                  sectionStyle={section}
                  variant="modern"
                >
                  <ColumnLayout
                    sectionId={section.id}
                    columns={columns}
                    isEditMode={false}
                    onColumnsChange={() => {}}
                    onItemClick={handleButtonClick}
                    onSelectItem={() => {}}
                  />
                  {sectionItems.length === 0 && (
                    <div className="text-center text-muted-foreground py-4 sm:py-6 text-xs sm:text-sm">
                      {t('common.noContent')}
                    </div>
                  )}
                </CollapsibleSection>
              );
            })}

            {/* No content fallback */}
            {sections.length === 0 && (
              <div className="text-center text-muted-foreground py-8 sm:py-12">
                <img
                  src={siteLogo}
                  alt="Logo"
                  className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 opacity-50"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = newPureLifeLogo;
                  }}
                />
                <p className="text-sm sm:text-base mb-2">Brak zawartości do wyświetlenia</p>
                <p className="text-xs sm:text-sm px-4">
                  {user ? (
                    <>
                      {isAdmin ? (
                        <>
                          Przejdź do <Link to="/admin" className="underline">panelu CMS</Link> aby dodać treści.
                        </>
                      ) : (
                        <>Skontaktuj się z administratorem aby dodać treści.</>
                      )}
                    </>
                  ) : (
                    <>Skontaktuj się z administratorem aby dodać treści.</>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-8 sm:py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <img 
                  src={siteLogo} 
                  alt="Pure Life" 
                  className="w-8 h-8 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = newPureLifeLogo;
                  }}
                />
                <span className="text-sm font-semibold text-foreground uppercase">PURE LIFE</span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                © 2024 Pure Life. Wszystkie prawa zastrzeżone.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;