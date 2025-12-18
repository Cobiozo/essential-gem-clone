import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Search, Flag } from 'lucide-react';

interface FlagOption {
  emoji: string;
  country: string;
  code: string;
}

const flagEmojis: FlagOption[] = [
  // Europa
  { emoji: '🇵🇱', country: 'Polska', code: 'pl' },
  { emoji: '🇩🇪', country: 'Niemcy', code: 'de' },
  { emoji: '🇬🇧', country: 'Wielka Brytania', code: 'en' },
  { emoji: '🇫🇷', country: 'Francja', code: 'fr' },
  { emoji: '🇮🇹', country: 'Włochy', code: 'it' },
  { emoji: '🇪🇸', country: 'Hiszpania', code: 'es' },
  { emoji: '🇵🇹', country: 'Portugalia', code: 'pt' },
  { emoji: '🇳🇱', country: 'Holandia', code: 'nl' },
  { emoji: '🇧🇪', country: 'Belgia', code: 'be' },
  { emoji: '🇦🇹', country: 'Austria', code: 'at' },
  { emoji: '🇨🇭', country: 'Szwajcaria', code: 'ch' },
  { emoji: '🇨🇿', country: 'Czechy', code: 'cs' },
  { emoji: '🇸🇰', country: 'Słowacja', code: 'sk' },
  { emoji: '🇭🇺', country: 'Węgry', code: 'hu' },
  { emoji: '🇷🇴', country: 'Rumunia', code: 'ro' },
  { emoji: '🇧🇬', country: 'Bułgaria', code: 'bg' },
  { emoji: '🇭🇷', country: 'Chorwacja', code: 'hr' },
  { emoji: '🇸🇮', country: 'Słowenia', code: 'sl' },
  { emoji: '🇷🇸', country: 'Serbia', code: 'sr' },
  { emoji: '🇺🇦', country: 'Ukraina', code: 'uk' },
  { emoji: '🇷🇺', country: 'Rosja', code: 'ru' },
  { emoji: '🇸🇪', country: 'Szwecja', code: 'sv' },
  { emoji: '🇳🇴', country: 'Norwegia', code: 'no' },
  { emoji: '🇩🇰', country: 'Dania', code: 'da' },
  { emoji: '🇫🇮', country: 'Finlandia', code: 'fi' },
  { emoji: '🇬🇷', country: 'Grecja', code: 'el' },
  { emoji: '🇹🇷', country: 'Turcja', code: 'tr' },
  { emoji: '🇮🇪', country: 'Irlandia', code: 'ga' },
  { emoji: '🇱🇹', country: 'Litwa', code: 'lt' },
  { emoji: '🇱🇻', country: 'Łotwa', code: 'lv' },
  { emoji: '🇪🇪', country: 'Estonia', code: 'et' },
  { emoji: '🇲🇹', country: 'Malta', code: 'mt' },
  { emoji: '🇨🇾', country: 'Cypr', code: 'cy' },
  { emoji: '🇱🇺', country: 'Luksemburg', code: 'lu' },
  { emoji: '🇮🇸', country: 'Islandia', code: 'is' },
  { emoji: '🇦🇱', country: 'Albania', code: 'sq' },
  { emoji: '🇲🇰', country: 'Macedonia Płn.', code: 'mk' },
  { emoji: '🇲🇪', country: 'Czarnogóra', code: 'me' },
  { emoji: '🇧🇦', country: 'Bośnia i Hercegowina', code: 'bs' },
  { emoji: '🇽🇰', country: 'Kosowo', code: 'xk' },
  { emoji: '🇲🇩', country: 'Mołdawia', code: 'md' },
  { emoji: '🇧🇾', country: 'Białoruś', code: 'by' },
  // Ameryki
  { emoji: '🇺🇸', country: 'USA', code: 'us' },
  { emoji: '🇨🇦', country: 'Kanada', code: 'ca' },
  { emoji: '🇲🇽', country: 'Meksyk', code: 'mx' },
  { emoji: '🇧🇷', country: 'Brazylia', code: 'br' },
  { emoji: '🇦🇷', country: 'Argentyna', code: 'ar' },
  { emoji: '🇨🇱', country: 'Chile', code: 'cl' },
  { emoji: '🇨🇴', country: 'Kolumbia', code: 'co' },
  { emoji: '🇵🇪', country: 'Peru', code: 'pe' },
  { emoji: '🇻🇪', country: 'Wenezuela', code: 've' },
  { emoji: '🇨🇺', country: 'Kuba', code: 'cu' },
  // Azja
  { emoji: '🇨🇳', country: 'Chiny', code: 'zh' },
  { emoji: '🇯🇵', country: 'Japonia', code: 'ja' },
  { emoji: '🇰🇷', country: 'Korea Płd.', code: 'ko' },
  { emoji: '🇰🇵', country: 'Korea Płn.', code: 'kp' },
  { emoji: '🇮🇳', country: 'Indie', code: 'hi' },
  { emoji: '🇮🇱', country: 'Izrael', code: 'he' },
  { emoji: '🇸🇦', country: 'Arabia Saudyjska', code: 'sa' },
  { emoji: '🇦🇪', country: 'ZEA', code: 'ae' },
  { emoji: '🇹🇭', country: 'Tajlandia', code: 'th' },
  { emoji: '🇻🇳', country: 'Wietnam', code: 'vi' },
  { emoji: '🇮🇩', country: 'Indonezja', code: 'id' },
  { emoji: '🇵🇭', country: 'Filipiny', code: 'tl' },
  { emoji: '🇲🇾', country: 'Malezja', code: 'my' },
  { emoji: '🇸🇬', country: 'Singapur', code: 'sg' },
  { emoji: '🇵🇰', country: 'Pakistan', code: 'pk' },
  { emoji: '🇧🇩', country: 'Bangladesz', code: 'bd' },
  { emoji: '🇮🇷', country: 'Iran', code: 'fa' },
  { emoji: '🇮🇶', country: 'Irak', code: 'iq' },
  { emoji: '🇹🇼', country: 'Tajwan', code: 'tw' },
  { emoji: '🇭🇰', country: 'Hongkong', code: 'hk' },
  { emoji: '🇲🇳', country: 'Mongolia', code: 'mn' },
  { emoji: '🇰🇿', country: 'Kazachstan', code: 'kk' },
  { emoji: '🇺🇿', country: 'Uzbekistan', code: 'uz' },
  { emoji: '🇬🇪', country: 'Gruzja', code: 'ka' },
  { emoji: '🇦🇲', country: 'Armenia', code: 'hy' },
  { emoji: '🇦🇿', country: 'Azerbejdżan', code: 'az' },
  // Oceania
  { emoji: '🇦🇺', country: 'Australia', code: 'au' },
  { emoji: '🇳🇿', country: 'Nowa Zelandia', code: 'nz' },
  // Afryka
  { emoji: '🇿🇦', country: 'RPA', code: 'za' },
  { emoji: '🇪🇬', country: 'Egipt', code: 'eg' },
  { emoji: '🇲🇦', country: 'Maroko', code: 'ma' },
  { emoji: '🇹🇳', country: 'Tunezja', code: 'tn' },
  { emoji: '🇩🇿', country: 'Algieria', code: 'dz' },
  { emoji: '🇳🇬', country: 'Nigeria', code: 'ng' },
  { emoji: '🇰🇪', country: 'Kenia', code: 'ke' },
  { emoji: '🇪🇹', country: 'Etiopia', code: 'et' },
  { emoji: '🇬🇭', country: 'Ghana', code: 'gh' },
  // Specjalne
  { emoji: '🏳️', country: 'Brak flagi', code: 'none' },
  { emoji: '🌍', country: 'Świat (Europa/Afryka)', code: 'world' },
  { emoji: '🌎', country: 'Świat (Ameryki)', code: 'world-am' },
  { emoji: '🌏', country: 'Świat (Azja)', code: 'world-as' },
  { emoji: '🇪🇺', country: 'Unia Europejska', code: 'eu' },
  { emoji: '🇺🇳', country: 'ONZ', code: 'un' },
];

interface FlagEmojiPickerProps {
  value?: string;
  onSelect: (emoji: string) => void;
  trigger?: React.ReactNode;
}

export const FlagEmojiPicker: React.FC<FlagEmojiPickerProps> = ({ 
  value, 
  onSelect, 
  trigger 
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredFlags = flagEmojis.filter(flag => 
    flag.country.toLowerCase().includes(search.toLowerCase()) ||
    flag.code.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (emoji: string) => {
    onSelect(emoji);
    setOpen(false);
    setSearch('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Flag className="w-4 h-4" />
            Wybierz flagę
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Szukaj kraju..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <ScrollArea className="h-64">
          <TooltipProvider delayDuration={300}>
            <div className="grid grid-cols-8 gap-1 p-3">
              {filteredFlags.map((flag) => (
                <Tooltip key={flag.code + flag.emoji}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => handleSelect(flag.emoji)}
                      className={`
                        w-8 h-8 flex items-center justify-center text-xl rounded-md
                        hover:bg-accent hover:scale-110 transition-all
                        ${value === flag.emoji ? 'bg-primary/20 ring-2 ring-primary' : ''}
                      `}
                    >
                      {flag.emoji}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {flag.country}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>
          {filteredFlags.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Nie znaleziono flag dla "{search}"
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default FlagEmojiPicker;
