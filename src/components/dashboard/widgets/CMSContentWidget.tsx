import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/components/ThemeProvider';
import { supabase } from '@/integrations/supabase/client';
import { useCMSSectionTranslations } from '@/hooks/useCMSSectionTranslations';
import { useCMSTranslations } from '@/hooks/useCMSTranslations';
import { convertSupabaseSections } from '@/lib/typeUtils';
import { isSectionVisible, isItemVisible } from '@/lib/visibilityUtils';
import { isProblematicColor, sanitizeHtmlForDarkMode } from '@/lib/colorUtils';
import { CMSSection, CMSItem, ContentCell } from '@/types/cms';
import { CMSContent } from '@/components/CMSContent';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Newspaper } from 'lucide-react';

const convertCellsFromDatabase = (cells: any): ContentCell[] => {
  if (!cells) return [];
  if (typeof cells === 'string') {
    try {
      const parsed = JSON.parse(cells);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      return [];
    }
  }
  if (Array.isArray(cells)) return cells;
  return [];
};

export const CMSContentWidget: React.FC = () => {
  const { user, userRole } = useAuth();
  const { language } = useLanguage();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  const [sections, setSections] = useState<CMSSection[]>([]);
  const [items, setItems] = useState<CMSItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openSections, setOpenSections] = useState<{ [key: string]: string | undefined }>({});

  const translatedSections = useCMSSectionTranslations(sections, language, 'pl');
  const translatedItems = useCMSTranslations(items, language, 'pl');

  useEffect(() => {
    const fetchCMSContent = async () => {
      try {
        const { data: mainPage } = await supabase
          .from('pages')
          .select('id')
          .eq('slug', 'glowna')
          .maybeSingle();

        if (!mainPage) {
          setLoading(false);
          return;
        }

        const { data: sectionsData } = await supabase
          .from('cms_sections')
          .select('*')
          .eq('page_id', mainPage.id)
          .eq('is_active', true)
          .eq('display_type', 'collapsible')
          .is('parent_id', null)
          .order('position', { ascending: true });

        if (sectionsData) {
          setSections(convertSupabaseSections(sectionsData));

          const sectionIds = sectionsData.map(s => s.id);
          if (sectionIds.length > 0) {
            const { data: itemsData } = await supabase
              .from('cms_items')
              .select('*')
              .in('section_id', sectionIds)
              .eq('is_active', true)
              .order('position', { ascending: true });

            if (itemsData) {
              setItems(itemsData.map((item: any) => ({
                ...item,
                cells: convertCellsFromDatabase(item.cells)
              })));
            }
          }
        }
      } catch (error) {
        console.error('Error fetching CMS content:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCMSContent();
  }, []);

  const visibleSections = translatedSections.filter(section => 
    isSectionVisible(section, user, userRole?.role || null)
  );

  if (loading) {
    return (
      <Card className="dashboard-widget">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-primary" />
            Aktualności
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  if (visibleSections.length === 0) return null;

  return (
    <Card className="dashboard-widget">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Newspaper className="h-5 w-5 text-primary" />
          Aktualności i ogłoszenia
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {visibleSections.map((section) => {
            const sectionItems = translatedItems
              .filter(item => item.section_id === section.id)
              .filter(item => isItemVisible(item, user, userRole?.role || null));

            const hasCustomHeader = !!(section as any).collapsible_header;
            const currentOpenValue = openSections[section.id] !== undefined 
              ? openSections[section.id]
              : (section.default_expanded ? section.id : undefined);

            return (
              <div 
                key={section.id}
                className="rounded-lg border border-border overflow-hidden"
                style={{
                  backgroundColor: (section.background_color && !isProblematicColor(section.background_color, isDarkMode, 'background')) 
                    ? section.background_color : undefined,
                }}
              >
                <Accordion 
                  type="single" 
                  collapsible 
                  value={currentOpenValue}
                  onValueChange={(value) => setOpenSections(prev => ({ ...prev, [section.id]: value }))}
                >
                  <AccordionItem value={section.id} className="border-none">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                      <div className="flex flex-col items-start gap-1 text-left">
                        {hasCustomHeader ? (
                          <span className="font-semibold text-foreground" dangerouslySetInnerHTML={{ __html: sanitizeHtmlForDarkMode((section as any).collapsible_header, isDarkMode) }} />
                        ) : section.title ? (
                          <span className="font-semibold text-foreground" dangerouslySetInnerHTML={{ __html: sanitizeHtmlForDarkMode(section.title, isDarkMode) }} />
                        ) : (
                          <span className="text-muted-foreground">Kliknij aby rozwinąć</span>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="space-y-3">
                        {sectionItems.map(item => <CMSContent key={item.id} item={item} />)}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
