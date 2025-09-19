import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Smile, Search, Heart, Star, ThumbsUp, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EmojiCategory {
  name: string;
  icon: string;
  emojis: string[];
}

const emojiCategories: EmojiCategory[] = [
  {
    name: 'Uśmiechy',
    icon: '😀',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🤩', '🥳']
  },
  {
    name: 'Serca',
    icon: '❤️',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🤎', '🖤', '🤍', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '♥️', '💌', '💋', '💐', '🌹', '🌺', '🌻', '🌷', '🌸']
  },
  {
    name: 'Ręce',
    icon: '👋',
    emojis: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '👊', '✊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏']
  },
  {
    name: 'Zwierzęta',
    icon: '🐶',
    emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙊', '🙉', '🙈', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗']
  },
  {
    name: 'Natura',
    icon: '🌳',
    emojis: ['🌱', '🌿', '🍀', '🌾', '🌵', '🌲', '🌳', '🌴', '🪴', '🌸', '🌺', '🌻', '🌹', '🥀', '🌷', '💐', '🍄', '🌰', '🌭', '🌮', '🌯', '🥙', '🥗', '🥘', '🍕', '🍔', '🍟', '🌶️', '🥕', '🌽', '🥒', '🥬']
  },
  {
    name: 'Obiekty',
    icon: '⚽',
    emojis: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂']
  }
];

const recentEmojis = ['😊', '👍', '❤️', '🎉', '🔥', '💯', '✨', '🌟'];

interface EmojiPickerProps {
  onEmojiSelect?: (emoji: string) => void;
  trigger?: React.ReactNode;
}

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ onEmojiSelect, trigger }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [copiedEmoji, setCopiedEmoji] = useState<string | null>(null);
  const { toast } = useToast();

  const filteredEmojis = emojiCategories.map(category => ({
    ...category,
    emojis: category.emojis.filter(emoji => 
      searchTerm === '' || 
      category.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => category.emojis.length > 0);

  const handleEmojiClick = (emoji: string) => {
    setSelectedEmoji(emoji);
    onEmojiSelect?.(emoji);
    
    // Copy to clipboard
    navigator.clipboard.writeText(emoji).then(() => {
      setCopiedEmoji(emoji);
      toast({
        title: "Emoji skopiowane",
        description: `${emoji} zostało skopiowane do schowka`,
      });
      
      setTimeout(() => setCopiedEmoji(null), 2000);
    });
  };

  const EmojiGrid = ({ emojis, title }: { emojis: string[]; title?: string }) => (
    <div>
      {title && <h4 className="font-medium mb-3 text-sm">{title}</h4>}
      <div className="grid grid-cols-8 gap-2">
        {emojis.map((emoji, index) => (
          <Button
            key={`${emoji}-${index}`}
            variant="ghost"
            size="sm"
            className={`h-10 w-10 p-0 text-lg hover:bg-muted relative ${
              selectedEmoji === emoji ? 'bg-primary/10 border-primary border' : ''
            }`}
            onClick={() => handleEmojiClick(emoji)}
          >
            {emoji}
            {copiedEmoji === emoji && (
              <div className="absolute -top-2 -right-2">
                <Check className="w-3 h-3 text-green-600" />
              </div>
            )}
          </Button>
        ))}
      </div>
    </div>
  );

  const pickerContent = (
    <div className="w-80 max-h-96 overflow-y-auto">
      {/* Search */}
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Szukaj emoji..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Recent Emojis */}
      {!searchTerm && (
        <div className="p-4 border-b">
          <EmojiGrid emojis={recentEmojis} title="Ostatnio używane" />
        </div>
      )}

      {/* Emoji Categories */}
      <Tabs defaultValue="smiles" className="w-full">
        <TabsList className="grid w-full grid-cols-6 p-1">
          <TabsTrigger value="smiles">😀</TabsTrigger>
          <TabsTrigger value="hearts">❤️</TabsTrigger>
          <TabsTrigger value="hands">👋</TabsTrigger>
          <TabsTrigger value="animals">🐶</TabsTrigger>
          <TabsTrigger value="nature">🌳</TabsTrigger>
          <TabsTrigger value="objects">⚽</TabsTrigger>
        </TabsList>
        
        {filteredEmojis.map((category, index) => (
          <TabsContent 
            key={category.name} 
            value={['smiles', 'hearts', 'hands', 'animals', 'nature', 'objects'][index]}
            className="p-4"
          >
            <EmojiGrid emojis={category.emojis} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );

  // If trigger is provided, use Popover
  if (trigger) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          {trigger}
        </PopoverTrigger>
        <PopoverContent className="p-0" align="start">
          {pickerContent}
        </PopoverContent>
      </Popover>
    );
  }

  // Otherwise, render as standalone component
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Smile className="w-5 h-5" />
          <span>Wybierz emoji</span>
        </CardTitle>
        <CardDescription>
          Kliknij emoji, aby skopiować do schowka
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {pickerContent}
      </CardContent>
    </Card>
  );
};

// Standalone Emoji Picker Component
export const EmojiPickerStandalone: React.FC = () => {
  const [selectedEmojis, setSelectedEmojis] = useState<string[]>([]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Smile className="w-5 h-5" />
          <span>Selektor emoji</span>
        </CardTitle>
        <CardDescription>
          Zarządzaj emoji w aplikacji
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Selected Emojis Display */}
          {selectedEmojis.length > 0 && (
            <div>
              <Label className="text-sm font-medium mb-2 block">Wybrane emoji</Label>
              <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-lg">
                {selectedEmojis.map((emoji, index) => (
                  <Badge key={index} variant="secondary" className="text-lg px-2 py-1">
                    {emoji}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Emoji Picker */}
          <EmojiPicker 
            onEmojiSelect={(emoji) => {
              if (!selectedEmojis.includes(emoji)) {
                setSelectedEmojis([...selectedEmojis, emoji]);
              }
            }}
          />

          {/* Clear Button */}
          {selectedEmojis.length > 0 && (
            <Button 
              variant="outline" 
              onClick={() => setSelectedEmojis([])}
              className="w-full"
            >
              Wyczyść wybrane emoji
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
