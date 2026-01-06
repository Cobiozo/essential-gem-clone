import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CountryDialCode {
  emoji: string;
  country: string;
  code: string;
  dialCode: string;
}

const europeanCountries: CountryDialCode[] = [
  { emoji: '🇵🇱', country: 'Polska', code: 'PL', dialCode: '+48' },
  { emoji: '🇩🇪', country: 'Niemcy', code: 'DE', dialCode: '+49' },
  { emoji: '🇬🇧', country: 'Wielka Brytania', code: 'GB', dialCode: '+44' },
  { emoji: '🇫🇷', country: 'Francja', code: 'FR', dialCode: '+33' },
  { emoji: '🇮🇹', country: 'Włochy', code: 'IT', dialCode: '+39' },
  { emoji: '🇪🇸', country: 'Hiszpania', code: 'ES', dialCode: '+34' },
  { emoji: '🇳🇱', country: 'Holandia', code: 'NL', dialCode: '+31' },
  { emoji: '🇧🇪', country: 'Belgia', code: 'BE', dialCode: '+32' },
  { emoji: '🇦🇹', country: 'Austria', code: 'AT', dialCode: '+43' },
  { emoji: '🇨🇭', country: 'Szwajcaria', code: 'CH', dialCode: '+41' },
  { emoji: '🇨🇿', country: 'Czechy', code: 'CZ', dialCode: '+420' },
  { emoji: '🇸🇰', country: 'Słowacja', code: 'SK', dialCode: '+421' },
  { emoji: '🇭🇺', country: 'Węgry', code: 'HU', dialCode: '+36' },
  { emoji: '🇷🇴', country: 'Rumunia', code: 'RO', dialCode: '+40' },
  { emoji: '🇧🇬', country: 'Bułgaria', code: 'BG', dialCode: '+359' },
  { emoji: '🇭🇷', country: 'Chorwacja', code: 'HR', dialCode: '+385' },
  { emoji: '🇸🇮', country: 'Słowenia', code: 'SI', dialCode: '+386' },
  { emoji: '🇷🇸', country: 'Serbia', code: 'RS', dialCode: '+381' },
  { emoji: '🇺🇦', country: 'Ukraina', code: 'UA', dialCode: '+380' },
  { emoji: '🇸🇪', country: 'Szwecja', code: 'SE', dialCode: '+46' },
  { emoji: '🇳🇴', country: 'Norwegia', code: 'NO', dialCode: '+47' },
  { emoji: '🇩🇰', country: 'Dania', code: 'DK', dialCode: '+45' },
  { emoji: '🇫🇮', country: 'Finlandia', code: 'FI', dialCode: '+358' },
  { emoji: '🇬🇷', country: 'Grecja', code: 'GR', dialCode: '+30' },
  { emoji: '🇵🇹', country: 'Portugalia', code: 'PT', dialCode: '+351' },
  { emoji: '🇮🇪', country: 'Irlandia', code: 'IE', dialCode: '+353' },
  { emoji: '🇱🇹', country: 'Litwa', code: 'LT', dialCode: '+370' },
  { emoji: '🇱🇻', country: 'Łotwa', code: 'LV', dialCode: '+371' },
  { emoji: '🇪🇪', country: 'Estonia', code: 'EE', dialCode: '+372' },
  { emoji: '🇱🇺', country: 'Luksemburg', code: 'LU', dialCode: '+352' },
  { emoji: '🇲🇹', country: 'Malta', code: 'MT', dialCode: '+356' },
  { emoji: '🇨🇾', country: 'Cypr', code: 'CY', dialCode: '+357' },
  { emoji: '🇮🇸', country: 'Islandia', code: 'IS', dialCode: '+354' },
  { emoji: '🇦🇱', country: 'Albania', code: 'AL', dialCode: '+355' },
  { emoji: '🇲🇰', country: 'Macedonia Północna', code: 'MK', dialCode: '+389' },
  { emoji: '🇲🇪', country: 'Czarnogóra', code: 'ME', dialCode: '+382' },
  { emoji: '🇧🇦', country: 'Bośnia i Hercegowina', code: 'BA', dialCode: '+387' },
  { emoji: '🇲🇩', country: 'Mołdawia', code: 'MD', dialCode: '+373' },
  { emoji: '🇧🇾', country: 'Białoruś', code: 'BY', dialCode: '+375' },
  { emoji: '🇷🇺', country: 'Rosja', code: 'RU', dialCode: '+7' },
  { emoji: '🇹🇷', country: 'Turcja', code: 'TR', dialCode: '+90' },
  { emoji: '🇲🇨', country: 'Monako', code: 'MC', dialCode: '+377' },
  { emoji: '🇦🇩', country: 'Andora', code: 'AD', dialCode: '+376' },
  { emoji: '🇱🇮', country: 'Liechtenstein', code: 'LI', dialCode: '+423' },
  { emoji: '🇸🇲', country: 'San Marino', code: 'SM', dialCode: '+378' },
  { emoji: '🇻🇦', country: 'Watykan', code: 'VA', dialCode: '+379' },
  { emoji: '🇽🇰', country: 'Kosowo', code: 'XK', dialCode: '+383' },
];

interface PhoneCountryCodePickerProps {
  selectedCode: string;
  onCodeChange: (code: string) => void;
  phoneNumber: string;
  onPhoneChange: (phone: string) => void;
  disabled?: boolean;
}

export const PhoneCountryCodePicker: React.FC<PhoneCountryCodePickerProps> = ({
  selectedCode,
  onCodeChange,
  phoneNumber,
  onPhoneChange,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedCountry = europeanCountries.find(c => c.dialCode === selectedCode) || europeanCountries[0];

  const filteredCountries = europeanCountries.filter(country =>
    country.country.toLowerCase().includes(search.toLowerCase()) ||
    country.dialCode.includes(search) ||
    country.code.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (country: CountryDialCode) => {
    onCodeChange(country.dialCode);
    setOpen(false);
    setSearch('');
  };

  return (
    <div className="flex gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-[120px] justify-between px-3 font-normal bg-background",
              !selectedCode && "text-muted-foreground"
            )}
            disabled={disabled}
          >
            <span className="flex items-center gap-1.5 truncate">
              <span className="text-base">{selectedCountry.emoji}</span>
              <span className="text-sm">{selectedCountry.dialCode}</span>
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0 bg-popover border border-border shadow-lg z-[100]" align="start">
          <div className="flex items-center border-b px-3 py-2">
            <Search className="h-4 w-4 shrink-0 opacity-50 mr-2" />
            <input
              className="flex h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              placeholder="Szukaj kraju..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <ScrollArea className="h-[280px]">
            <div className="p-1">
              {filteredCountries.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Nie znaleziono kraju
                </div>
              ) : (
                filteredCountries.map((country) => (
                  <button
                    key={country.code}
                    type="button"
                    className={cn(
                      "flex w-full items-center justify-between rounded-sm px-2 py-2 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer",
                      selectedCode === country.dialCode && "bg-accent text-accent-foreground"
                    )}
                    onClick={() => handleSelect(country)}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-lg">{country.emoji}</span>
                      <span>{country.country}</span>
                    </span>
                    <span className="text-muted-foreground">{country.dialCode}</span>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
      <Input
        type="tel"
        value={phoneNumber}
        onChange={(e) => onPhoneChange(e.target.value)}
        placeholder="123 456 789"
        disabled={disabled}
        className="flex-1"
      />
    </div>
  );
};

export default PhoneCountryCodePicker;
