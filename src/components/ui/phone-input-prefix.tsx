import React, { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Country {
  code: string;
  name: string;
  prefix: string;
  flag: string;
}

const countries: Country[] = [
  { code: 'PL', name: 'Polska', prefix: '+48', flag: '🇵🇱' },
  { code: 'DE', name: 'Deutschland', prefix: '+49', flag: '🇩🇪' },
  { code: 'GB', name: 'United Kingdom', prefix: '+44', flag: '🇬🇧' },
  { code: 'US', name: 'United States', prefix: '+1', flag: '🇺🇸' },
  { code: 'UA', name: 'Україна', prefix: '+380', flag: '🇺🇦' },
  { code: 'FR', name: 'France', prefix: '+33', flag: '🇫🇷' },
  { code: 'IT', name: 'Italia', prefix: '+39', flag: '🇮🇹' },
  { code: 'ES', name: 'España', prefix: '+34', flag: '🇪🇸' },
  { code: 'NL', name: 'Nederland', prefix: '+31', flag: '🇳🇱' },
  { code: 'CZ', name: 'Česko', prefix: '+420', flag: '🇨🇿' },
  { code: 'SK', name: 'Slovensko', prefix: '+421', flag: '🇸🇰' },
  { code: 'AT', name: 'Österreich', prefix: '+43', flag: '🇦🇹' },
  { code: 'CH', name: 'Schweiz', prefix: '+41', flag: '🇨🇭' },
  { code: 'SE', name: 'Sverige', prefix: '+46', flag: '🇸🇪' },
  { code: 'NO', name: 'Norge', prefix: '+47', flag: '🇳🇴' },
  { code: 'LT', name: 'Lietuva', prefix: '+370', flag: '🇱🇹' },
  { code: 'RO', name: 'România', prefix: '+40', flag: '🇷🇴' },
  { code: 'BE', name: 'België', prefix: '+32', flag: '🇧🇪' },
];

interface PhoneInputWithPrefixProps {
  value?: string;
  onChange: (value: string) => void;
  defaultCountry?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export const PhoneInputWithPrefix: React.FC<PhoneInputWithPrefixProps> = ({
  value = '',
  onChange,
  defaultCountry = 'PL',
  placeholder = '123456789',
  disabled = false,
  className,
}) => {
  // Parse value to extract prefix and digits
  const getInitialCountry = () => {
    if (value) {
      const match = countries.find(c => value.startsWith(c.prefix));
      if (match) return match;
    }
    return countries.find(c => c.code === defaultCountry) || countries[0];
  };

  const [selectedCountry, setSelectedCountry] = useState<Country>(getInitialCountry);

  const getDigits = useCallback(() => {
    if (!value) return '';
    const match = countries.find(c => value.startsWith(c.prefix));
    if (match) return value.slice(match.prefix.length);
    // If value doesn't start with any known prefix, return raw
    return value.replace(/[^\d]/g, '');
  }, [value]);

  const handleDigitsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d]/g, '');
    onChange(selectedCountry.prefix + raw);
  };

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const country = countries.find(c => c.code === e.target.value);
    if (country) {
      setSelectedCountry(country);
      const digits = getDigits();
      onChange(country.prefix + digits);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow: backspace, delete, tab, escape, enter, arrows
    const allowed = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (allowed.includes(e.key)) return;
    // Allow Ctrl/Cmd + A/C/V/X
    if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) return;
    // Block non-digit
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
    }
  };

  return (
    <div className={cn("flex gap-0", className)}>
      <select
        value={selectedCountry.code}
        onChange={handleCountryChange}
        disabled={disabled}
        className="flex h-10 items-center rounded-l-md border border-r-0 border-input bg-background px-2 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-w-[90px]"
      >
        {countries.map(c => (
          <option key={c.code} value={c.code}>
            {c.flag} {c.prefix}
          </option>
        ))}
      </select>
      <Input
        type="tel"
        inputMode="numeric"
        value={getDigits()}
        onChange={handleDigitsChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="rounded-l-none"
      />
    </div>
  );
};
