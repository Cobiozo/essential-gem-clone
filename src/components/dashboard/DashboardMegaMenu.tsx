import React, { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { useSidebarNavigation, MenuItem, SubMenuItem } from '@/hooks/useSidebarNavigation';
import { useSidebar } from '@/components/ui/sidebar';

interface DashboardMegaMenuProps {
  open: boolean;
  onClose: () => void;
}

const sectionLabels: Record<string, string> = {
  knowledge: 'Wiedza',
  community: 'Społeczność',
  tools: 'Narzędzia',
  system: 'System',
};

const sectionOrder = ['knowledge', 'community', 'tools', 'system'] as const;

export const DashboardMegaMenu: React.FC<DashboardMegaMenuProps> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { toast } = useToast();
  const { groupedItems, getLabel } = useSidebarNavigation();
  const { setOpenMobile } = useSidebar();

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleItemClick = useCallback((item: MenuItem) => {
    if (item.action) {
      item.action();
    } else if (item.path) {
      const url = item.tab ? `${item.path}?tab=${item.tab}` : item.path;
      navigate(url);
    }
    setOpenMobile(false);
    onClose();
  }, [navigate, onClose, setOpenMobile]);

  const handleSubItemClick = useCallback(async (subItem: SubMenuItem) => {
    if (subItem.clipboardContent) {
      try {
        await navigator.clipboard.writeText(subItem.clipboardContent);
        toast({ title: t('common.copied') || 'Skopiowano!', description: subItem.labelKey });
      } catch (error) {
        console.error('Failed to copy:', error);
      }
      onClose();
      return;
    }
    if (subItem.isExternal && subItem.path && subItem.path !== '#') {
      window.open(subItem.path, '_blank', 'noopener,noreferrer');
      onClose();
      return;
    }
    navigate(subItem.path);
    setOpenMobile(false);
    onClose();
  }, [navigate, onClose, toast, t, setOpenMobile]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-md animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Menu content */}
      <div className="relative z-10 w-full max-w-4xl max-h-[85vh] overflow-auto mx-4 rounded-2xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl animate-in zoom-in-95 fade-in duration-200">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-border bg-card/95 backdrop-blur-xl rounded-t-2xl">
          <h2 className="text-lg font-semibold text-foreground">Menu</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Grid content */}
        <div className="p-6 space-y-8">
          {sectionOrder.map(sectionKey => {
            const items = groupedItems[sectionKey];
            if (!items || items.length === 0) return null;

            return (
              <div key={sectionKey}>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1">
                  {sectionLabels[sectionKey]}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {items.map(item => (
                    <MegaMenuTile
                      key={item.id}
                      item={item}
                      getLabel={getLabel}
                      onClick={handleItemClick}
                      onSubClick={handleSubItemClick}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface MegaMenuTileProps {
  item: MenuItem;
  getLabel: (key: string) => string;
  onClick: (item: MenuItem) => void;
  onSubClick: (sub: SubMenuItem) => void;
}

const MegaMenuTile: React.FC<MegaMenuTileProps> = ({ item, getLabel, onClick, onSubClick }) => {
  const [expanded, setExpanded] = React.useState(false);
  const hasSubmenu = item.hasSubmenu && item.submenuItems && item.submenuItems.length > 0;

  const handleClick = () => {
    if (hasSubmenu) {
      setExpanded(!expanded);
    } else {
      onClick(item);
    }
  };

  return (
    <div className="flex flex-col">
      <button
        onClick={handleClick}
        className="group flex flex-col items-center gap-2 rounded-xl border border-border/50 bg-muted/30 p-4 
          transition-all duration-200 hover:bg-primary/10 hover:border-primary/30 hover:shadow-md
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
          min-h-[88px] justify-center text-center"
      >
        <item.icon className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
        <span className="text-sm font-medium text-foreground leading-tight">
          {getLabel(item.labelKey)}
        </span>
      </button>
      
      {/* Expanded submenu */}
      {hasSubmenu && expanded && (
        <div className="mt-1 rounded-lg border border-border/30 bg-muted/20 p-2 space-y-0.5 animate-in slide-in-from-top-2 duration-150">
          {item.submenuItems!.map(sub => (
            <button
              key={sub.id}
              onClick={() => onSubClick(sub)}
              className="flex items-center gap-2 w-full rounded-md px-3 py-2 text-left text-sm text-muted-foreground 
                hover:bg-primary/10 hover:text-foreground transition-colors"
            >
              {sub.icon && <sub.icon className="h-3.5 w-3.5 shrink-0" />}
              <span className="truncate">{sub.isDynamic ? sub.labelKey : getLabel(sub.labelKey)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
