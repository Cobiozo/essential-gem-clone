import React, { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';

interface LanguageOption {
  code: string;
  name: string;
  native_name: string | null;
}

// Mapowanie kodów języków na kody krajów (ISO 3166-1)
const languageToCountry: Record<string, string> = {
  'pl': 'pl',
  'en': 'gb',
  'de': 'de',
  'it': 'it',
  'es': 'es',
  'fr': 'fr',
  'pt': 'pt'
};

const getFlagUrl = (langCode: string): string => {
  const countryCode = languageToCountry[langCode] || langCode;
  return `https://flagcdn.com/w40/${countryCode}.png`;
};

export const LanguageSelector: React.FC = () => {
  const { language, setLanguage } = useLanguage();
  const [languages, setLanguages] = useState<LanguageOption[]>([
    { code: 'pl', name: 'Polish', native_name: 'Polski' },
    { code: 'de', name: 'German', native_name: 'Deutsch' },
    { code: 'en', name: 'English', native_name: 'English' }
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

  const selectedLanguage = languages.find(l => l.code === language);

  return (
    <div data-tour="language-selector">
      <Select value={language} onValueChange={(value) => setLanguage(value)}>
      <SelectTrigger className="w-auto h-8 border-0 bg-transparent px-2 hover:bg-accent/50">
        <SelectValue>
          {selectedLanguage && (
            <img 
              src={getFlagUrl(selectedLanguage.code)} 
              alt={selectedLanguage.name}
              className="w-8 h-5 object-cover rounded shadow-sm"
            />
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="end">
        {languages.map((lang) => (
          <SelectItem key={lang.code} value={lang.code}>
            <span className="flex items-center gap-3">
              <img 
                src={getFlagUrl(lang.code)} 
                alt={lang.name}
                className="w-6 h-4 object-cover rounded-sm shadow-sm"
              />
              <span>{lang.native_name || lang.name}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    </div>
  );
};
