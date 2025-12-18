import React, { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface LanguageOption {
  code: string;
  name: string;
  native_name: string | null;
  flag_emoji: string;
}

export const LanguageSelector: React.FC = () => {
  const { language, setLanguage } = useLanguage();
  const [languages, setLanguages] = useState<LanguageOption[]>([
    { code: 'pl', name: 'Polish', native_name: 'Polski', flag_emoji: '🇵🇱' },
    { code: 'de', name: 'German', native_name: 'Deutsch', flag_emoji: '🇩🇪' },
    { code: 'en', name: 'English', native_name: 'English', flag_emoji: '🇬🇧' }
  ]);

  useEffect(() => {
    const fetchLanguages = async () => {
      const { data, error } = await supabase
        .from('i18n_languages')
        .select('code, name, native_name, flag_emoji')
        .eq('is_active', true)
        .order('position');
      
      if (!error && data && data.length > 0) {
        setLanguages(data);
      }
    };

    fetchLanguages();
  }, []);

  return (
    <div className="flex items-center gap-2">
      <Globe className="h-4 w-4 text-muted-foreground" />
      <Select value={language} onValueChange={(value) => setLanguage(value)}>
        <SelectTrigger className="w-[140px] h-8 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {languages.map((lang) => (
            <SelectItem key={lang.code} value={lang.code}>
              <span className="flex items-center gap-2">
                <span>{lang.flag_emoji}</span>
                <span>{lang.native_name || lang.name}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
