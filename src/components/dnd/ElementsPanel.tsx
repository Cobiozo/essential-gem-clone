import React, { useState, useMemo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ItemEditorWrapper } from '@/components/cms/ItemEditorWrapper';
import { SectionEditor } from '@/components/cms/SectionEditor';
import { ElementPreview } from './ElementPreview';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Search,
  Type, 
  Image as ImageIcon, 
  Video, 
  MousePointer2, 
  Minus, 
  AlignLeft,
  Box,
  Grid3X3,
  Star,
  MapPin,
  ImagePlus,
  Smile,
  Images,
  Accessibility,
  LayoutGrid,
  List,
  Hash,
  BarChart3,
  MessageSquare,
  CreditCard,
  ChevronDown,
  ToggleLeft,
  Share2,
  AlertCircle,
  Music,
  Code2,
  Code,
  Anchor,
  PanelLeft,
  Info,
  StarHalf,
  ThumbsUp,
  FileCode,
  Spline,
  Clock,
  X,
  FileDown,
  Clipboard
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CollapsibleSection } from '@/components/CollapsibleSection';

interface ElementItem {
  id: string;
  title: string;
  icon: React.ReactNode;
  type: string;
  description?: string;
  tags?: string[];
}

interface ElementCategory {
  id: string;
  title: string;
  items: ElementItem[];
  defaultOpen?: boolean;
}

interface ElementsPanelProps {
  className?: string;
  onElementClick?: (elementType: string) => void;
  panelMode?: 'elements' | 'properties';
  onPanelModeChange?: (mode: 'elements' | 'properties') => void;
  editingItemId?: string | null;
  editingItem?: any;
  isItemEditorOpen?: boolean;
  onSaveItem?: (updatedItem: Partial<any>) => Promise<void>;
  onCancelEdit?: () => void;
  editingSectionId?: string | null;
  editingSection?: any;
  isSectionEditorOpen?: boolean;
  onSaveSection?: (updatedSection: Partial<any>) => Promise<void>;
  onCancelSectionEdit?: () => void;
  recentlyUsed?: string[];
}

// Recently used elements storage key
const RECENTLY_USED_KEY = 'layout-editor-recently-used';

export const ElementsPanel: React.FC<ElementsPanelProps> = ({ 
  className,
  onElementClick,
  panelMode = 'elements',
  onPanelModeChange,
  editingItemId,
  editingItem,
  isItemEditorOpen,
  onSaveItem,
  onCancelEdit,
  editingSectionId,
  editingSection,
  isSectionEditorOpen,
  onSaveSection,
  onCancelSectionEdit,
}) => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['recently-used', 'layout', 'basic']);
  const [recentlyUsed, setRecentlyUsed] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(RECENTLY_USED_KEY) || '[]');
    } catch {
      return [];
    }
  });

  const layoutElements: ElementCategory = {
    id: 'layout',
    title: t('elements.layout'),
    defaultOpen: true,
    items: [
      { id: 'container', title: t('elements.container'), icon: <Box className="w-5 h-5" />, type: 'container', description: t('elements.containerDesc'), tags: ['layout', 'box'] },
      { id: 'grid', title: t('elements.grid'), icon: <Grid3X3 className="w-5 h-5" />, type: 'grid', description: t('elements.gridDesc'), tags: ['layout', 'columns', 'grid'] },
      { id: 'pure-life-container', title: t('elements.pureLifeContainer'), icon: <Grid3X3 className="w-5 h-5 text-blue-500" />, type: 'pure-life-container', description: t('elements.pureLifeContainerDesc'), tags: ['layout', 'branded'] },
      { id: 'collapsible-section', title: t('elements.collapsibleSection'), icon: <ChevronDown className="w-5 h-5 text-amber-500" />, type: 'collapsible-section', description: t('elements.collapsibleSectionDesc'), tags: ['layout', 'accordion', 'collapse'] },
      { id: 'collapsible-pure-life', title: t('elements.collapsiblePureLife'), icon: <ChevronDown className="w-5 h-5 text-emerald-500" />, type: 'collapsible-pure-life', description: t('elements.collapsiblePureLifeDesc'), tags: ['layout', 'accordion', 'pure life', 'collapse'] },
    ]
  };

  const basicElements: ElementCategory = {
    id: 'basic',
    title: t('elements.basic'),
    items: [
      { id: 'heading', title: t('elements.heading'), icon: <Type className="w-5 h-5" />, type: 'heading', description: t('elements.headingDesc'), tags: ['text', 'title'] },
      { id: 'image', title: t('elements.image'), icon: <ImageIcon className="w-5 h-5" />, type: 'image', description: t('elements.imageDesc'), tags: ['media', 'photo'] },
      { id: 'text', title: t('elements.text'), icon: <AlignLeft className="w-5 h-5" />, type: 'text', description: t('elements.textDesc'), tags: ['text', 'paragraph'] },
      { id: 'video', title: t('elements.video'), icon: <Video className="w-5 h-5" />, type: 'video', description: t('elements.videoDesc'), tags: ['media', 'embed'] },
      { id: 'button', title: t('elements.button'), icon: <MousePointer2 className="w-5 h-5" />, type: 'button', description: t('elements.buttonDesc'), tags: ['cta', 'link'] },
      { id: 'copy-to-clipboard', title: t('elements.copyToClipboard'), icon: <Clipboard className="w-5 h-5" />, type: 'copy-to-clipboard', description: t('elements.copyToClipboardDesc'), tags: ['copy', 'clipboard', 'button'] },
      { id: 'file-download', title: t('elements.fileDownload'), icon: <FileDown className="w-5 h-5" />, type: 'file-download', description: t('elements.fileDownloadDesc'), tags: ['download', 'file', 'pdf'] },
      { id: 'info-text', title: t('elements.infoText'), icon: <Info className="w-5 h-5" />, type: 'info_text', description: t('elements.infoTextDesc'), tags: ['icon', 'text'] },
      { id: 'divider', title: t('elements.divider'), icon: <Minus className="w-5 h-5" />, type: 'divider', description: t('elements.dividerDesc'), tags: ['separator', 'line'] },
      { id: 'spacer', title: t('elements.spacer'), icon: <AlignLeft className="w-5 h-5 rotate-90" />, type: 'spacer', description: t('elements.spacerDesc'), tags: ['space', 'margin'] },
      { id: 'maps', title: t('elements.map'), icon: <MapPin className="w-5 h-5" />, type: 'maps', description: t('elements.mapDesc'), tags: ['location', 'embed'] },
      { id: 'icon', title: t('elements.icon'), icon: <Star className="w-5 h-5" />, type: 'icon', description: t('elements.iconDesc'), tags: ['icon', 'symbol'] },
    ]
  };

  const generalElements: ElementCategory = {
    id: 'general',
    title: t('elements.general'),
    items: [
      { id: 'image-field', title: t('elements.imageField'), icon: <ImagePlus className="w-5 h-5" />, type: 'image-field', description: t('elements.imageFieldDesc'), tags: ['media', 'upload'] },
      { id: 'icon-field', title: t('elements.iconField'), icon: <Smile className="w-5 h-5" />, type: 'icon-field', description: t('elements.iconFieldDesc'), tags: ['icon', 'picker'] },
      { id: 'carousel', title: t('elements.carousel'), icon: <Images className="w-5 h-5" />, type: 'carousel', description: t('elements.carouselDesc'), tags: ['gallery', 'slider'] },
      { id: 'accessibility', title: t('elements.accessibility'), icon: <Accessibility className="w-5 h-5" />, type: 'accessibility', description: t('elements.accessibilityDesc'), tags: ['a11y', 'aria'] },
      { id: 'gallery', title: t('elements.gallery'), icon: <LayoutGrid className="w-5 h-5" />, type: 'gallery', description: t('elements.galleryDesc'), tags: ['images', 'grid'] },
      { id: 'icon-list', title: t('elements.iconList'), icon: <List className="w-5 h-5" />, type: 'icon-list', description: t('elements.iconListDesc'), tags: ['list', 'bullets'] },
      { id: 'counter', title: t('elements.counter'), icon: <Hash className="w-5 h-5" />, type: 'counter', description: t('elements.counterDesc'), tags: ['animation', 'stats'] },
      { id: 'progress-bar', title: t('elements.progress'), icon: <BarChart3 className="w-5 h-5" />, type: 'progress-bar', description: t('elements.progressDesc'), tags: ['progress', 'bar'] },
      { id: 'testimonial', title: t('elements.testimonial'), icon: <MessageSquare className="w-5 h-5" />, type: 'testimonial', description: t('elements.testimonialDesc'), tags: ['quote', 'review'] },
      { id: 'cards', title: t('elements.cards'), icon: <CreditCard className="w-5 h-5" />, type: 'cards', description: t('elements.cardsDesc'), tags: ['card', 'content'] },
      { id: 'accordion', title: t('elements.accordion'), icon: <ChevronDown className="w-5 h-5" />, type: 'accordion', description: t('elements.accordionDesc'), tags: ['faq', 'collapse'] },
      { id: 'toggle', title: t('elements.toggle'), icon: <ToggleLeft className="w-5 h-5" />, type: 'toggle', description: t('elements.toggleDesc'), tags: ['switch', 'expand'] },
      { id: 'multi-cell', title: t('elements.multiCell'), icon: <LayoutGrid className="w-5 h-5" />, type: 'multi_cell', description: t('elements.multiCellDesc'), tags: ['cells', 'accordion', 'learn more', 'collapse'] },
      { id: 'social-icons', title: t('elements.social'), icon: <Share2 className="w-5 h-5" />, type: 'social-icons', description: t('elements.socialDesc'), tags: ['social', 'links'] },
      { id: 'alert', title: t('elements.alert'), icon: <AlertCircle className="w-5 h-5" />, type: 'alert', description: t('elements.alertDesc'), tags: ['notice', 'warning'] },
      { id: 'soundcloud', title: t('elements.soundcloud'), icon: <Music className="w-5 h-5" />, type: 'soundcloud', description: t('elements.soundcloudDesc'), tags: ['audio', 'embed'] },
      { id: 'shortcode', title: t('elements.shortcode'), icon: <Code2 className="w-5 h-5" />, type: 'shortcode', description: t('elements.shortcodeDesc'), tags: ['code', 'embed'] },
      { id: 'html', title: t('elements.html'), icon: <Code className="w-5 h-5" />, type: 'html', description: t('elements.htmlDesc'), tags: ['code', 'custom'] },
      { id: 'menu-anchor', title: t('elements.menuAnchor'), icon: <Anchor className="w-5 h-5" />, type: 'menu-anchor', description: t('elements.menuAnchorDesc'), tags: ['anchor', 'navigation'] },
      { id: 'sidebar', title: t('elements.sidebar'), icon: <PanelLeft className="w-5 h-5" />, type: 'sidebar', description: t('elements.sidebarDesc'), tags: ['sidebar', 'layout'] },
      { id: 'learn-more', title: t('elements.learnMore'), icon: <Info className="w-5 h-5" />, type: 'learn-more', description: t('elements.learnMoreDesc'), tags: ['accordion', 'collapse', 'layout'] },
      { id: 'rating', title: t('elements.rating'), icon: <StarHalf className="w-5 h-5" />, type: 'rating', description: t('elements.ratingDesc'), tags: ['stars', 'rating'] },
      { id: 'trustindex', title: t('elements.trustindex'), icon: <ThumbsUp className="w-5 h-5" />, type: 'trustindex', description: t('elements.trustindexDesc'), tags: ['reviews', 'embed'] },
      { id: 'ppom', title: t('elements.ppom'), icon: <FileCode className="w-5 h-5" />, type: 'ppom', description: t('elements.ppomDesc'), tags: ['product', 'woo'] },
      { id: 'text-path', title: t('elements.textPath'), icon: <Spline className="w-5 h-5" />, type: 'text-path', description: t('elements.textPathDesc'), tags: ['svg', 'animation'] },
    ]
  };

  const allCategories = [layoutElements, basicElements, generalElements];
  const allItems = allCategories.flatMap(c => c.items);

  // Create recently used category
  const recentlyUsedCategory: ElementCategory | null = useMemo(() => {
    if (recentlyUsed.length === 0) return null;
    const items = recentlyUsed
      .map(type => allItems.find(i => i.type === type))
      .filter((item): item is ElementItem => item !== undefined)
      .slice(0, 6);
    
    if (items.length === 0) return null;
    
    return {
      id: 'recently-used',
      title: t('elements.recentlyUsed'),
      defaultOpen: true,
      items,
    };
  }, [recentlyUsed, allItems, t]);

  const filteredCategories = useMemo(() => {
    const categories = recentlyUsedCategory 
      ? [recentlyUsedCategory, ...allCategories] 
      : allCategories;

    if (!searchQuery) return categories;

    return categories.map(category => ({
      ...category,
      items: category.items.filter(item => 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    })).filter(category => category.items.length > 0);
  }, [searchQuery, recentlyUsedCategory, allCategories]);

  const handleElementDrag = (elementType: string) => {
    // Update recently used
    setRecentlyUsed(prev => {
      const newRecent = [elementType, ...prev.filter(t => t !== elementType)].slice(0, 10);
      localStorage.setItem(RECENTLY_USED_KEY, JSON.stringify(newRecent));
      return newRecent;
    });
  };

  return (
    <Card className={cn("w-96 h-screen border-r rounded-none flex flex-col", className)}>
      <CardContent className="p-0 h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b shrink-0 bg-gradient-to-r from-background to-muted/30">
          <div className="flex items-center gap-2 mb-2">
            {panelMode === 'properties' && onPanelModeChange && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onPanelModeChange('elements')}
                className="px-2 hover:bg-background"
              >
                {t('editor.back')}
              </Button>
            )}
            <h2 className="text-lg font-bold text-center flex-1">
              {panelMode === 'elements' ? t('editor.elements') : t('editor.properties')}
            </h2>
          </div>
        </div>
        
        {panelMode === 'elements' ? (
          <div className="flex-1 overflow-hidden flex flex-col">
            <Tabs defaultValue="widgets" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="grid w-full grid-cols-2 mx-4 mt-2 shrink-0">
                <TabsTrigger value="widgets" className="text-sm">{t('editor.widgets')}</TabsTrigger>
                <TabsTrigger value="global" className="text-sm">{t('editor.global')}</TabsTrigger>
              </TabsList>

              {/* Search */}
              <div className="relative px-4 py-3 shrink-0">
                <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t('editor.searchWidget')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-8 bg-muted/50 border-0 focus-visible:ring-1"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-5 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                    onClick={() => setSearchQuery('')}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>

              <TabsContent value="widgets" className="flex-1 overflow-auto m-0">
                <div className="space-y-1 p-3">
                  {filteredCategories.map((category) => (
                    <CollapsibleSection
                      key={category.id}
                      title={`${category.title} (${category.items.length})`}
                      isOpen={expandedCategories.includes(category.id)}
                      onOpenChange={(open) => {
                        if (open) {
                          setExpandedCategories([...expandedCategories, category.id]);
                        } else {
                          setExpandedCategories(expandedCategories.filter(id => id !== category.id));
                        }
                      }}
                      className="mb-1"
                    >
                      <div className="grid grid-cols-2 gap-2 mt-2 pb-2">
                        {category.items.map((item) => (
                          <DraggableElement
                            key={`${category.id}-${item.id}`}
                            id={`new-${item.type}`}
                            elementType={item.type}
                            icon={item.icon}
                            title={item.title}
                            description={item.description}
                            onDragStart={() => handleElementDrag(item.type)}
                          />
                        ))}
                      </div>
                    </CollapsibleSection>
                  ))}
                  
                  {filteredCategories.length === 0 && searchQuery && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">{t('editor.noResults')} "{searchQuery}"</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="global" className="mt-4">
                <div className="p-4 text-center text-sm text-muted-foreground">
                  <Box className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  {t('editor.globalSoon')}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="flex-1 overflow-auto min-h-0 min-w-0">
            {editingSection && onSaveSection && onCancelSectionEdit ? (
              <SectionEditor
                key={editingSectionId}
                section={editingSection}
                onSave={onSaveSection}
                onCancel={onCancelSectionEdit}
              />
            ) : editingItem && onSaveItem && onCancelEdit ? (
              <ItemEditorWrapper
                key={editingItemId}
                item={editingItem}
                sectionId={editingItem.section_id || ''}
                onSave={onSaveItem}
                onCancel={onCancelEdit}
              />
            ) : (
              <div className="text-center text-sm text-muted-foreground py-8">
                {t('editor.selectElement')}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Draggable element component with preview on hover
interface DraggableElementProps {
  id: string;
  elementType: string;
  icon: React.ReactNode;
  title: string;
  description?: string;
  onDragStart?: () => void;
}

const DraggableElement: React.FC<DraggableElementProps> = ({ 
  id, 
  elementType, 
  icon, 
  title, 
  description,
  onDragStart 
}) => {
  const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({
    id,
    data: {
      type: 'new-element',
      elementType,
    },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    touchAction: 'none',
  } : {
    touchAction: 'none',
  };

  // Call onDragStart when dragging begins
  React.useEffect(() => {
    if (isDragging && onDragStart) {
      onDragStart();
    }
  }, [isDragging, onDragStart]);

  return (
    <TooltipProvider delayDuration={500}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            style={style}
            className={cn(
              "flex flex-col items-center justify-center gap-1.5 p-3",
              "rounded-lg border bg-card hover:bg-accent/50 transition-all duration-200",
              "cursor-grab active:cursor-grabbing group select-none",
              "touch-none hover:shadow-md hover:border-primary/30",
              "hover:scale-[1.02] active:scale-[0.98]",
              isDragging && "opacity-50 z-50 shadow-lg ring-2 ring-primary"
            )}
          >
            <div className="text-muted-foreground group-hover:text-primary transition-colors pointer-events-none">
              {icon}
            </div>
            <span className="text-xs text-center font-medium pointer-events-none line-clamp-1">
              {title}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-[200px] p-0 overflow-hidden">
          <div className="bg-popover border rounded-lg shadow-lg">
            <ElementPreview type={elementType} className="bg-muted/50" />
            <div className="p-2 border-t">
              <p className="font-medium text-sm">{title}</p>
              {description && (
                <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
              )}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
