import React from 'react';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { CMSContent } from '@/components/CMSContent';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Settings, LogOut } from 'lucide-react';
import { useSecurityPreventions } from '@/hooks/useSecurityPreventions';
import { ThemeSelector } from '@/components/ThemeSelector';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSelector } from '@/components/LanguageSelector';
import { isExternalUrl } from '@/lib/urlUtils';
import newPureLifeLogo from '@/assets/pure-life-logo-new.png';
import niezbednikLogo from '@/assets/logo-niezbednika-pure-life.png';
import { convertSupabaseSections } from '@/lib/typeUtils';
import { ColumnLayout } from '@/components/dnd/ColumnLayout';
import { useIsMobile } from '@/hooks/use-mobile';

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
        sectionsQuery = sectionsQuery.eq('visible_to_everyone', true);
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
      
      // Pobierz teksty nagłówka, autora i logo z system_texts
      const { data: systemTexts } = await (supabase as any)
        .from('system_texts')
        .select('type, content, text_formatting')
        .eq('is_active', true)
        .in('type', ['header_text', 'author', 'site_logo']);
      
      const headerSystemText = systemTexts?.find((item: any) => item.type === 'header_text');
      const authorSystemText = systemTexts?.find((item: any) => item.type === 'author');
      const logoSystemText = systemTexts?.find((item: any) => item.type === 'site_logo');
      
      if (headerSystemText?.content) setHeaderText(headerSystemText.content);
      if (authorSystemText?.content) setAuthorText(authorSystemText.content);
      if (logoSystemText?.content) setSiteLogo(logoSystemText.content);
      
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
    <div className="min-h-screen bg-background relative">
      {/* Top Left Logo */}
      <div className="fixed top-4 left-4 z-50">
        <img 
          src={siteLogo} 
          alt="Logo" 
          className="w-8 h-8 sm:w-10 sm:h-10"
          onError={(e) => {
            (e.target as HTMLImageElement).src = newPureLifeLogo;
          }}
        />
      </div>

      {/* Language & Theme Selector - positioned in top right */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        <LanguageSelector />
        <ThemeSelector />
      </div>
      
      {/* Header */}
      <header className="text-center mb-8 px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <img src={niezbednikLogo} alt="Niezbędnik Pure Life" className="w-full max-w-xs sm:max-w-sm lg:max-w-md mx-auto" />
        </div>
        
        {/* Header text with formatting support */}
        {headerText && (
          <div className="text-xs sm:text-sm lg:text-base text-muted-foreground leading-relaxed mb-6 px-2">
            <span dangerouslySetInnerHTML={{ __html: headerText }} />
          </div>
        )}
        
        {!headerText && (
          <p className="text-xs sm:text-sm lg:text-base text-muted-foreground leading-relaxed mb-6 px-2">
            Witaj w Niezbędniku Pure Life - przestrzeni stworzonej z myślą o Tobie i Twojej codziennej pracy w zespole Pure Life. Tu znajdziesz materiały oraz zasoby, które pomogą Ci być skutecznym profesjonalistą i lekarstwem.
          </p>
        )}
        
        {/* Author text with formatting support */}
        {authorText && (
          <div className="text-xs sm:text-sm text-muted-foreground mb-4">
            <span dangerouslySetInnerHTML={{ __html: authorText }} />
          </div>
        )}
        
        {!authorText && (
          <p className="text-xs sm:text-sm text-muted-foreground mb-4">
            Pozostałem - Dawid Kowalczyk
          </p>
        )}
        
        {/* User Controls */}
        {user && (
          <div className="flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-2 mb-4">
            {isAdmin ? (
              <Link to="/admin">
                <Button variant="outline" size="sm" className="text-xs w-full sm:w-auto">
                  <Settings className="w-3 h-3 mr-1" />
                  {t('nav.admin')}
                </Button>
              </Link>
             ) : (
              <Link to="/my-account">
                <Button variant="outline" size="sm" className="text-xs w-full sm:w-auto">
                  <Settings className="w-3 h-3 mr-1" />
                  {t('nav.myAccount')}
                </Button>
              </Link>
             )}
            <Button variant="outline" size="sm" onClick={handleSignOut} className="text-xs w-full sm:w-auto">
              <LogOut className="w-3 h-3 mr-1" />
              {t('nav.logout')}
            </Button>
          </div>
        )}
        
        {!user && (
          <div className="flex justify-center mb-4">
            <Link to="/auth">
              <Button variant="outline" size="sm" className="text-xs w-full sm:w-auto">
                <Settings className="w-3 h-3 mr-1" />
                {t('nav.login')}
              </Button>
            </Link>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="px-4 sm:px-6 lg:px-12 xl:px-16 2xl:px-20">
        <div className="max-w-7xl mx-auto">
          <div
            className={sectionLayoutMode === 'single' ? 'space-y-4 lg:space-y-6' : 'grid items-start gap-4 lg:gap-6'}
            style={sectionLayoutMode === 'single' ? undefined : { gridTemplateColumns: `repeat(${Math.max(1, Math.min(4, sectionColumnCount))}, minmax(0, 1fr))` }}
          >
            {sections.filter(s => (s as any).parent_id == null).map((section) => {
              if (section.section_type === 'row') {
                const rowColumnCount = section.row_column_count || 1;
                const childSections = sections.filter(s => s.parent_id === section.id)
                  .sort((a, b) => a.position - b.position);

                // Map children to fixed column slots based on their position (like in editor)
                const slotSections: (CMSSection | undefined)[] = Array.from({ length: rowColumnCount }, () => undefined);
                childSections.forEach((child) => {
                  const pos = typeof child.position === 'number' ? child.position : 0;
                  if (pos >= 0 && pos < rowColumnCount && !slotSections[pos]) {
                    slotSections[pos] = child;
                  } else {
                    const freeIndex = slotSections.findIndex((s) => !s);
                    if (freeIndex !== -1) slotSections[freeIndex] = child;
                  }
                });

                const isCustomRow = section.row_layout_type === 'custom' || slotSections.some((sec) => !!sec && sec.width_type === 'custom' && (sec.custom_width ?? 0) > 0);
                
                return (
                  <div key={`row-${section.id}`} className="w-full">
                    <div
                      className={isCustomRow ? 'flex flex-row flex-wrap gap-4 w-full' : 'grid gap-4 lg:gap-6 w-full'}
                      style={isCustomRow ? undefined : { gridTemplateColumns: `repeat(${rowColumnCount}, minmax(0, 1fr))` }}
                    >
                      {Array.from({ length: rowColumnCount }, (_, colIndex) => {
                        const childSection = slotSections[colIndex];
                        return (
                          <div
                            key={`row-${section.id}-col-${colIndex}`}
                            className={isCustomRow ? 'space-y-4 shrink-0' : 'space-y-4'}
                            style={
                              isCustomRow
                                ? (isMobile
                                    ? { width: '100%' }
                                    : (childSection?.width_type === 'custom' && childSection?.custom_width
                                        ? { width: `${childSection.custom_width}px` }
                                        : undefined))
                                : undefined
                            }
                          >
                            {childSection && (() => {
                              const sectionItems = items
                                .filter(item => item.section_id === childSection.id && item.type !== 'header_text' && item.type !== 'author')
                                .sort((a, b) => a.position - b.position);
                              const maxColIndex = sectionItems.reduce((max, item) => Math.max(max, item.column_index ?? 0), 0);
                              const columnCount = Math.max(1, maxColIndex + 1);
                              const columns: Column[] = Array.from({ length: columnCount }, (_, i) => ({ id: `${childSection.id}-col-${i}`, items: [], width: 100 / columnCount }));
                              sectionItems.forEach((item) => {
                                const ci = Math.min(columns.length - 1, Math.max(0, item.column_index || 0));
                                columns[ci].items.push(item);
                              });
                              const shouldShowShare = ['Strefa współpracy', 'Klient', 'Social Media', 'Materiały - social media', 'Aplikacje', 'Materiały na zamówienie'].includes(childSection.title);
                              return (
                                <CollapsibleSection 
                                  key={`section-${childSection.id}-${childSection.title}`}
                                  title={childSection.title}
                                  description={childSection.description}
                                  defaultOpen={childSection.default_expanded || false}
                                  showShareButton={shouldShowShare}
                                  sectionStyle={childSection}
                                >
                                  <ColumnLayout
                                    sectionId={childSection.id}
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
                            })()}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }
              
              // Zwykłe sekcje (nie-row)
              const sectionItems = items.filter(item => 
                item.section_id === section.id && 
                item.type !== 'header_text' && 
                item.type !== 'author'
              ).sort((a, b) => a.position - b.position);
              // Derive column count from items' column_index to reflect saved layout
              const maxColIndex = sectionItems.reduce((max, item) => Math.max(max, item.column_index ?? 0), 0);
              const columnCount = Math.max(1, maxColIndex + 1);
              
              // Group items by column_index
              const columns: Column[] = Array.from({ length: Math.max(1, columnCount) }, (_, i) => ({
                id: `${section.id}-col-${i}`,
                items: [],
                width: 100 / Math.max(1, columnCount),
              }));
              
              sectionItems.forEach((item) => {
                const colIndex = Math.min(columns.length - 1, Math.max(0, item.column_index || 0));
                columns[colIndex].items.push(item);
              });
              
              const shouldShowShare = ['Strefa współpracy', 'Klient', 'Social Media', 'Materiały - social media', 'Aplikacje', 'Materiały na zamówienie'].includes(section.title);
              
              return (
                <CollapsibleSection 
                  key={`section-${section.id}-${section.title}`}
                  title={section.title}
                  description={section.description}
                  defaultOpen={section.default_expanded || false}
                  showShareButton={shouldShowShare}
                  sectionStyle={section}
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
          </div>
        </div>
        
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
                    <>Przejdź do <Link to="/admin" className="underline">panelu CMS</Link> aby dodać treści.</>
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
        
        {/* Footer Logo */}
        <div className="text-center py-6 sm:py-8">
          <img 
            src={siteLogo} 
            alt="Logo" 
            className="w-12 h-12 sm:w-16 sm:h-16 mx-auto"
            onError={(e) => {
              (e.target as HTMLImageElement).src = newPureLifeLogo;
            }}
          />
          <div className="text-base sm:text-lg font-bold text-foreground mt-2">PURE LIFE</div>
        </div>
      </main>
    </div>
  );
};

export default Index;