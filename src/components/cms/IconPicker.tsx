import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Star, X } from 'lucide-react';
import * as icons from 'lucide-react';
import { cn } from '@/lib/utils';

interface IconPickerProps {
  value?: string | null;
  onChange: (iconName: string | null) => void;
  trigger?: React.ReactNode;
}

// Popular icons for quick access
const popularIcons = [
  'Check', 'X', 'ChevronRight', 'ChevronDown', 'Menu',
  'Search', 'Mail', 'Phone', 'MapPin', 'Calendar',
  'Star', 'Heart', 'ShoppingCart', 'User', 'Home',
  'Settings', 'Info', 'AlertCircle', 'Download', 'Upload',
  'Plus', 'Minus', 'Edit', 'Trash2', 'Copy',
  'ExternalLink', 'Link', 'ArrowRight', 'ArrowLeft', 'Play'
];

// Icon categories
const iconCategories = {
  'UI': ['Menu', 'X', 'Check', 'ChevronRight', 'ChevronLeft', 'ChevronUp', 'ChevronDown', 'Plus', 'Minus', 'Settings', 'MoreVertical', 'MoreHorizontal'],
  'Strzałki': ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'TrendingUp', 'TrendingDown', 'ChevronsRight', 'ChevronsLeft', 'MoveRight', 'MoveLeft'],
  'Komunikacja': ['Mail', 'Phone', 'MessageSquare', 'MessageCircle', 'Send', 'Inbox', 'AtSign', 'PhoneCall', 'Video', 'Voicemail'],
  'Media': ['Play', 'Pause', 'StopCircle', 'SkipForward', 'SkipBack', 'Volume2', 'VolumeX', 'Music', 'Image', 'Film'],
  'Zakupy': ['ShoppingCart', 'ShoppingBag', 'CreditCard', 'Package', 'Gift', 'Store', 'Tag', 'Ticket', 'DollarSign', 'Euro'],
  'Social': ['Facebook', 'Twitter', 'Instagram', 'Linkedin', 'Youtube', 'Github', 'Share2', 'ThumbsUp', 'Heart', 'MessageCircle'],
  'Biznes': ['Briefcase', 'Building', 'TrendingUp', 'BarChart', 'PieChart', 'Target', 'Award', 'Flag', 'Users', 'UserPlus'],
  'Lokalizacja': ['MapPin', 'Map', 'Navigation', 'Compass', 'Globe', 'Locate', 'Navigation2', 'Route'],
  'Pliki': ['File', 'FileText', 'Folder', 'FolderOpen', 'Download', 'Upload', 'Save', 'Paperclip', 'Archive', 'Trash2'],
  'Narzędzia': ['Edit', 'Copy', 'Scissors', 'Search', 'Zap', 'Key', 'Lock', 'Unlock', 'Eye', 'EyeOff']
};

export const IconPicker: React.FC<IconPickerProps> = ({ value, onChange, trigger }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [open, setOpen] = useState(false);

  // Get all icon names from lucide-react
  const allIconNames = Object.keys(icons).filter(
    key => key !== 'createLucideIcon' && 
           key !== 'Icon' && 
           typeof (icons as any)[key] === 'object'
  );

  // Filter icons based on search
  const filteredIcons = searchTerm 
    ? allIconNames.filter(name => 
        name.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 50) // Limit to 50 results for performance
    : popularIcons;

  const handleIconSelect = (iconName: string) => {
    onChange(iconName);
    setOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setOpen(false);
  };

  const IconGrid = ({ icons: iconList }: { icons: string[] }) => (
    <div className="grid grid-cols-6 gap-2">
      {iconList.map((iconName) => {
        const IconComp = (icons as any)[iconName];
        if (!IconComp) return null;
        
        return (
          <Button
            key={iconName}
            variant={value === iconName ? 'default' : 'ghost'}
            size="sm"
            className={cn(
              'h-10 w-10 p-0',
              value === iconName && 'bg-primary text-primary-foreground'
            )}
            onClick={() => handleIconSelect(iconName)}
            title={iconName}
          >
            <IconComp className="w-4 h-4" />
          </Button>
        );
      })}
    </div>
  );

  const SelectedIcon = value ? (icons as any)[value] : null;

  const pickerContent = (
    <div className="w-96">
      {/* Header with search and clear */}
      <div className="p-3 border-b space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Wybierz ikonę</Label>
          {value && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-6 px-2 text-xs"
            >
              <X className="w-3 h-3 mr-1" />
              Wyczyść
            </Button>
          )}
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Szukaj ikony..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-9"
          />
        </div>
        {value && SelectedIcon && (
          <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
            <SelectedIcon className="w-4 h-4" />
            <span className="text-xs font-medium">{value}</span>
          </div>
        )}
      </div>

      {/* Icons */}
      <ScrollArea className="h-80">
        <div className="p-3 space-y-4">
          {searchTerm ? (
            <div>
              <p className="text-xs text-muted-foreground mb-2">
                {filteredIcons.length} wyników
              </p>
              <IconGrid icons={filteredIcons} />
            </div>
          ) : (
            <>
              <div>
                <h4 className="text-xs font-medium mb-2 text-muted-foreground">
                  Popularne
                </h4>
                <IconGrid icons={popularIcons} />
              </div>
              
              {Object.entries(iconCategories).map(([category, categoryIcons]) => (
                <div key={category}>
                  <h4 className="text-xs font-medium mb-2 text-muted-foreground">
                    {category}
                  </h4>
                  <IconGrid icons={categoryIcons} />
                </div>
              ))}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );

  if (trigger) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          {trigger}
        </PopoverTrigger>
        <PopoverContent className="p-0" align="start">
          {pickerContent}
        </PopoverContent>
      </Popover>
    );
  }

  return pickerContent;
};
