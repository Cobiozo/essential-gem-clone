import React, { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';

interface LanguageOption {
  code: string;
  name: string;
  native_name: string | null;
}

const languageToCountry: Record<string, string> = {
  'pl': 'pl',
  'en': 'gb',
  'de': 'de',
  'it': 'it',
  'es': 'es',
  'fr': 'fr',
  'pt': 'pt',
};

const getFlagUrl = (langCode: string): string => {
  const countryCode = languageToCountry[langCode] || langCode;
  return `https://flagcdn.com/w40/${countryCode}.png`;
};

interface InvitationLanguageSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

export const InvitationLanguageSelect: React.FC<InvitationLanguageSelectProps> = ({
  value,
  onValueChange,
  className = '',
}) => {
  const [languages, setLanguages] = useState<LanguageOption[]>([
    { code: 'pl', name: 'Polish', native_name: 'Polski' },
    { code: 'de', name: 'German', native_name: 'Deutsch' },
    { code: 'en', name: 'English', native_name: 'English' },
  ]);

  useEffect(() => {
    const fetchLanguages = async () => {
      const { data, error } = await supabase
        .from('i18n_languages')
        .select('code, name, native_name')
        .eq('is_active', true)
        .order('position');

      if (!error && data && data.length > 0) {
        setLanguages(data);
      }
    };
    fetchLanguages();
  }, []);

  const selectedLanguage = languages.find((l) => l.code === value);

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        className={`w-auto h-7 border-0 bg-transparent px-1.5 hover:bg-accent/50 ${className}`}
        title="Język wiadomości"
      >
        <SelectValue>
          {selectedLanguage && (
            <img
              src={getFlagUrl(selectedLanguage.code)}
              alt={selectedLanguage.name}
              className="w-6 h-4 object-cover rounded-sm shadow-sm"
            />
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="end">
        {languages.map((lang) => (
          <SelectItem key={lang.code} value={lang.code}>
            <span className="flex items-center gap-2">
              <img
                src={getFlagUrl(lang.code)}
                alt={lang.name}
                className="w-5 h-3.5 object-cover rounded-sm shadow-sm"
              />
              <span className="text-sm">{lang.native_name || lang.name}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
