import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useSecurityPreventions } from '@/hooks/useSecurityPreventions';
import { useLanguage } from '@/contexts/LanguageContext';
import newPureLifeLogo from '@/assets/pure-life-logo-new.png';
import niezbednikLogo from '@/assets/logo-niezbednika-pure-life.png';
import { Header } from '@/components/Header';
import { HeroSection } from '@/components/HeroSection';
import Footer from '@/components/homepage/Footer';
import { CMSContent } from '@/components/CMSContent';
import { convertSupabaseSections } from '@/lib/typeUtils';
import { CMSSection, CMSItem, ContentCell } from '@/types/cms';
import { LearnMoreItem } from '@/components/homepage/LearnMoreItem';
import { InfoTextItem } from '@/components/homepage/InfoTextItem';
import { HomeRowContainer } from '@/components/homepage/HomeRowContainer';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/ThemeProvider';
import { isProblematicColor } from '@/lib/colorUtils';
import { isSectionVisible, isItemVisible } from '@/lib/visibilityUtils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const Index = () => {
  const { user, userRole } = useAuth();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const [headerText, setHeaderText] = React.useState<string>('');
  const [authorText, setAuthorText] = React.useState<string>('');
  const [siteLogo, setSiteLogo] = React.useState<string>(newPureLifeLogo);
  const [headerImage, setHeaderImage] = React.useState<string>(niezbednikLogo);
  const [headerImageSize, setHeaderImageSize] = React.useState<'small' | 'medium' | 'large' | 'xlarge' | 'custom'>('medium');
  const [headerImageCustomWidth, setHeaderImageCustomWidth] = React.useState<number>(128);
  const [headerImageCustomHeight, setHeaderImageCustomHeight] = React.useState<number>(128);
  const [publishedPages, setPublishedPages] = React.useState<any[]>([]);
  const [sections, setSections] = React.useState<CMSSection[]>([]);
  const [items, setItems] = React.useState<CMSItem[]>([]);
  const [nestedSections, setNestedSections] = React.useState<{[key: string]: CMSSection[]}>({});
  const [loading, setLoading] = React.useState(true);
  const [mainPageId, setMainPageId] = React.useState<string | null>(null);
  const [expandedItemId, setExpandedItemId] = React.useState<string | null>(null);
  // State for collapsible sections - track which sections are open
  const [openCollapsibleSections, setOpenCollapsibleSections] = React.useState<{[key: string]: string | undefined}>({});
  
  // Enable security preventions
  useSecurityPreventions();

  // Helper function to convert cells from database format
  const convertCellsFromDatabase = (cells: any): ContentCell[] => {
    if (!cells) return [];
    if (typeof cells === 'string') {
      try {
        const parsed = JSON.parse(cells);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch (e) {
        return [];
      }
    }
    if (Array.isArray(cells)) {
      return cells;
    }
    return [];
  };

  const convertDatabaseItemToCMSItem = (dbItem: any): CMSItem => {
    return {
      ...dbItem,
      cells: convertCellsFromDatabase(dbItem.cells)
    };
  };

  React.useEffect(() => {
    fetchBasicData();

    // Setup realtime subscriptions for CMS changes
    const sectionsChannel = supabase
      .channel('cms-sections-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cms_sections'
        },
        () => {
          console.log('CMS sections updated, refetching...');
          fetchBasicData();
        }
      )
      .subscribe();

    const itemsChannel = supabase
      .channel('cms-items-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cms_items'
        },
        () => {
          console.log('CMS items updated, refetching...');
          fetchBasicData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sectionsChannel);
      supabase.removeChannel(itemsChannel);
    };
  }, [user]);

  const fetchBasicData = async () => {
    try {
      // Pobierz teksty nagłówka, autora, logo i zdjęcie nagłówka z system_texts
      const { data: systemTexts } = await supabase
        .from('system_texts')
        .select('type, content, text_formatting')
        .eq('is_active', true)
        .in('type', ['header_text', 'author', 'site_logo', 'header_image', 'header_image_size']);
      
      const headerSystemText = systemTexts?.find((item: any) => item.type === 'header_text');
      const authorSystemText = systemTexts?.find((item: any) => item.type === 'author');
      const logoSystemText = systemTexts?.find((item: any) => item.type === 'site_logo');
      const headerImageSystemText = systemTexts?.find((item: any) => item.type === 'header_image');
      const headerImageSizeSystemText = systemTexts?.find((item: any) => item.type === 'header_image_size');
      
      if (headerSystemText?.content) setHeaderText(headerSystemText.content);
      if (authorSystemText?.content) setAuthorText(authorSystemText.content);
      if (logoSystemText?.content) setSiteLogo(logoSystemText.content);
      if (headerImageSystemText?.content) setHeaderImage(headerImageSystemText.content);
      
      // Parse header image size settings
      if (headerImageSizeSystemText?.content) {
        try {
          const parsed = JSON.parse(headerImageSizeSystemText.content);
          setHeaderImageSize(parsed.size || 'medium');
          setHeaderImageCustomWidth(parsed.customWidth || 128);
          setHeaderImageCustomHeight(parsed.customHeight || 128);
        } catch {
          // Invalid JSON, use defaults
        }
      }
      
      // Pobierz opublikowane strony
      const { data: pagesData } = await supabase
        .from('pages')
        .select('id, title, slug, meta_description, created_at')
        .eq('is_published', true)
        .eq('is_active', true)
        .eq('visible_to_everyone', true)
        .order('position', { ascending: true });
      
      setPublishedPages(pagesData || []);

      // Pobierz stronę główną "Główna"
      const { data: mainPage } = await supabase
        .from('pages')
        .select('id')
        .eq('slug', 'glowna')
        .maybeSingle();

      if (mainPage) {
        setMainPageId(mainPage.id);

        // Pobierz wszystkie sekcje CMS dla strony głównej (wiersze i zwykłe sekcje)
        const { data: sectionsData, error: sectionsError } = await supabase
          .from('cms_sections')
          .select('*')
          .eq('page_id', mainPage.id)
          .eq('is_active', true)
          .order('position', { ascending: true });

        if (!sectionsError && sectionsData) {
          const allSections = convertSupabaseSections(sectionsData);
          setSections(allSections);

          // Zgrupuj dzieci według parent_id
          const nestedSectionsData: {[key: string]: CMSSection[]} = {};
          allSections.forEach(section => {
            if (section.parent_id) {
              if (!nestedSectionsData[section.parent_id]) {
                nestedSectionsData[section.parent_id] = [];
              }
              nestedSectionsData[section.parent_id].push(section);
            }
          });
          setNestedSections(nestedSectionsData);
        }

        // Pobierz itemy CMS dla strony głównej
        const { data: itemsData, error: itemsError } = await supabase
          .from('cms_items')
          .select('*')
          .eq('page_id', mainPage.id)
          .eq('is_active', true)
          .order('position', { ascending: true });

        if (!itemsError && itemsData) {
          setItems(itemsData.map(convertDatabaseItemToCMSItem));
        }
      }
      
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Render individual item with custom styling
  const renderCMSItem = (item: CMSItem, section: CMSSection) => {
    // For info_text type in grid sections (Team and Contact sections)
    if (item.type === 'info_text' && section.display_type === 'grid') {
      return <InfoTextItem key={item.id} item={item} />;
    }

    // For multi_cell type in Learn More section
    if (item.type === 'multi_cell') {
      const sectionItems = items.filter(i => i.section_id === section.id);
      const itemIndex = sectionItems.findIndex(i => i.id === item.id);
      return (
        <LearnMoreItem 
          key={item.id} 
          item={item} 
          itemIndex={itemIndex}
          isExpanded={expandedItemId === item.id}
          onToggle={() => setExpandedItemId(expandedItemId === item.id ? null : item.id)}
        />
      );
    }

    // Default rendering using CMSContent
    return <CMSContent key={item.id} item={item} />;
  };

  // Render CMS section with custom styling (matching LivePreviewEditor)
  const renderCMSSection = (section: CMSSection) => {
    const sectionItems = items
      .filter(item => item.section_id === section.id)
      .filter(item => isItemVisible(item, user, userRole?.role || null));
    
    // Check if section has column layout defined in style_class
    const columnMatch = section.style_class?.match(/columns-(\d+)/);
    const sectionColumnCount = columnMatch ? parseInt(columnMatch[1], 10) : 0;
    
    // Group items by column_index if columns are defined
    let itemsByColumn: CMSItem[][] = [];
    if (sectionColumnCount > 0) {
      itemsByColumn = Array.from({ length: sectionColumnCount }, () => []);
      sectionItems.forEach(item => {
        const colIdx = Math.min(sectionColumnCount - 1, Math.max(0, (item as any).column_index || 0));
        itemsByColumn[colIdx].push(item);
      });
    }

    // Check if section contains only multi_cell items
    const hasOnlyMultiCell = sectionItems.length > 0 && sectionItems.every(item => item.type === 'multi_cell');

    // Collapsible section rendering (accordion)
    if (section.display_type === 'collapsible') {
      const hasCustomHeader = !!(section as any).collapsible_header;
      // Use controlled state - initialize with default_expanded if not yet set
      const currentOpenValue = openCollapsibleSections[section.id] !== undefined 
        ? openCollapsibleSections[section.id]
        : (section.default_expanded ? section.id : undefined);
      
      const handleValueChange = (value: string | undefined) => {
        setOpenCollapsibleSections(prev => ({
          ...prev,
          [section.id]: value
        }));
      };
      
      return (
        <div 
          key={section.id}
          className="block w-full bg-card mb-4 md:mb-6"
          style={{
            backgroundColor: (section.background_color && !isProblematicColor(section.background_color, isDarkMode, 'background')) 
                            ? section.background_color : undefined,
            color: (section.text_color && !isProblematicColor(section.text_color, isDarkMode, 'text')) 
                  ? section.text_color : undefined,
            padding: section.padding ? `${section.padding}px 16px` : '32px 16px',
          }}
        >
          <div className="max-w-6xl mx-auto px-4">
            <Accordion 
              type="single" 
              collapsible 
              value={currentOpenValue}
              onValueChange={handleValueChange}
              className="w-full"
            >
              <AccordionItem value={section.id} className="border-none">
                <AccordionTrigger 
                  className="py-6 hover:no-underline text-2xl md:text-3xl font-bold"
                  style={{
                    color: (section.text_color && !isProblematicColor(section.text_color, isDarkMode, 'text')) 
                          ? section.text_color : undefined,
                    fontSize: section.font_size ? `${section.font_size}px` : undefined,
                    fontWeight: section.font_weight || 600,
                  }}
                >
                  <div className="flex flex-col items-start gap-2 text-left">
                    {/* Custom header or title */}
                    {hasCustomHeader ? (
                      <span dangerouslySetInnerHTML={{ __html: (section as any).collapsible_header }} />
                    ) : section.title ? (
                      <span dangerouslySetInnerHTML={{ __html: section.title }} />
                    ) : (
                      <span className="text-muted-foreground">Kliknij aby rozwinąć</span>
                    )}
                    {/* Show description in trigger if custom header is set */}
                    {hasCustomHeader && section.description && (
                      <span 
                        className="text-sm font-normal text-muted-foreground"
                        dangerouslySetInnerHTML={{ __html: section.description }}
                      />
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-6">
                  {/* Show description in content only if custom header is NOT set */}
                  {!hasCustomHeader && section.description && (
                    <p className="text-muted-foreground mb-6" dangerouslySetInnerHTML={{ __html: section.description }} />
                  )}
                  {/* Show title in content if custom header is set */}
                  {hasCustomHeader && section.title && section.show_title !== false && (
                    <h3 
                      className="text-2xl font-bold mb-4"
                      style={{ 
                        color: (section.text_color && !isProblematicColor(section.text_color, isDarkMode, 'text')) 
                              ? section.text_color : undefined 
                      }}
                      dangerouslySetInnerHTML={{ __html: section.title }}
                    />
                  )}
                  <div className="space-y-3 md:space-y-4">
                    {sectionItems.map(item => renderCMSItem(item, section))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      );
    }

    // Special rendering for multi_cell sections (matching LivePreviewEditor)
    if (hasOnlyMultiCell) {
      return (
        <div 
          key={section.id}
          className="block w-full bg-card mb-4 md:mb-6"
          style={{
            backgroundColor: (section.background_color && !isProblematicColor(section.background_color, isDarkMode, 'background')) 
                            ? section.background_color : undefined,
            color: (section.text_color && !isProblematicColor(section.text_color, isDarkMode, 'text')) 
                  ? section.text_color : undefined,
            padding: section.padding ? `${section.padding}px 16px` : '32px 16px',
          }}
        >
          <div className="max-w-6xl mx-auto px-4">
            <div className="space-y-3 md:space-y-4 py-4 md:py-6">
              {section.title && section.show_title !== false && (
                <h2 className="text-2xl md:text-3xl font-bold text-center mb-6 md:mb-8" 
                    style={{ color: (section.text_color && !isProblematicColor(section.text_color, isDarkMode, 'text')) 
                                    ? section.text_color : undefined }}>
                  {section.title}
                </h2>
              )}
              {section.description && (
                <div 
                  className="text-center text-muted-foreground text-sm md:text-base mb-4 md:mb-6 max-w-3xl mx-auto"
                  dangerouslySetInnerHTML={{ __html: section.description }}
                />
              )}
              <div className="space-y-3 md:space-y-4">
                {sectionItems.map((item, itemIdx) => {
                  const itemIndex = sectionItems.findIndex(i => i.id === item.id);
                  return (
                    <LearnMoreItem 
                      key={item.id}
                      item={item} 
                      itemIndex={itemIndex}
                      isExpanded={expandedItemId === item.id}
                      onToggle={() => setExpandedItemId(expandedItemId === item.id ? null : item.id)}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Helper for responsive grid
    const getColumnGridClass = (colCount: number) => {
      if (colCount === 1) return 'grid-cols-1';
      if (colCount === 2) return 'grid-cols-1 md:grid-cols-2';
      if (colCount === 3) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
      if (colCount >= 4) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
      return 'grid-cols-1';
    };

    // Regular section rendering (matching LivePreviewEditor)
    return (
      <div 
        key={section.id}
        className="block w-full bg-card mb-4 md:mb-6"
        style={{
          backgroundColor: (section.background_color && !isProblematicColor(section.background_color, isDarkMode, 'background')) 
                          ? section.background_color : undefined,
          color: (section.text_color && !isProblematicColor(section.text_color, isDarkMode, 'text')) 
                ? section.text_color : undefined,
          padding: section.padding ? `${section.padding}px 16px` : '32px 16px',
        }}
      >
        <div className="max-w-6xl mx-auto px-4">
          {/* Section Header */}
          {(section.title && section.show_title !== false) || section.description ? (
            <div className="text-center mb-6 md:mb-10">
              {section.title && section.show_title !== false && (
                <h2 
                  className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4 md:mb-6 text-foreground uppercase tracking-wide"
                  dangerouslySetInnerHTML={{ __html: section.title }}
                />
              )}
              {section.description && (
                <p 
                  className="text-muted-foreground text-sm md:text-base lg:text-lg max-w-3xl mx-auto leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: section.description }}
                />
              )}
            </div>
          ) : null}
          
          {/* Section Items */}
          {sectionColumnCount > 0 ? (
            <div className={cn('grid gap-4 md:gap-6', getColumnGridClass(sectionColumnCount))}>
              {itemsByColumn.map((columnItems, colIdx) => (
                <div key={colIdx} className="space-y-3 md:space-y-4">
                  {columnItems.map(item => renderCMSItem(item, section))}
                </div>
              ))}
            </div>
          ) : (
            <div className={section.display_type === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 lg:gap-12 mt-6 md:mt-8' : 'space-y-3 md:space-y-4'}>
              {sectionItems.map(item => renderCMSItem(item, section))}
            </div>
          )}
        </div>
      </div>
    );
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
        imageSize={headerImageSize}
        customImageWidth={headerImageCustomWidth}
        customImageHeight={headerImageCustomHeight}
      />

      {/* Main Content - CMS Sections */}
      <main id="main-content" className="bg-background">
        {sections.length > 0 ? (
          <>
            {/* Renderuj wiersze z zagnieżdżonymi sekcjami */}
            {sections
              .filter(s => s.section_type === 'row' && !s.parent_id)
              .filter(s => isSectionVisible(s, user, userRole?.role || null))
              .map(row => (
                <HomeRowContainer 
                  key={row.id}
                  row={row}
                  children={(nestedSections[row.id] || []).filter(child => isSectionVisible(child, user, userRole?.role || null))}
                  items={items}
                  user={user}
                  userRole={userRole?.role || null}
                />
              ))}

            {/* Renderuj płaskie sekcje (nowe stylizowane) */}
            {sections
              .filter(s => s.section_type === 'section' && !s.parent_id)
              .filter(s => isSectionVisible(s, user, userRole?.role || null))
              .map(section => renderCMSSection(section))}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Ładowanie zawartości...</p>
          </div>
        )}
      </main>
      
      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Index;
