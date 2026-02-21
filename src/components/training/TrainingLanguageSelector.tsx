import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, GraduationCap, Globe } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface LanguageOption {
  code: string;
  name: string;
  native_name: string;
}

interface TrainingLanguageSelectorProps {
  userId: string;
  onLanguageSelected: (languageCode: string) => void;
}

export const TrainingLanguageSelector: React.FC<TrainingLanguageSelectorProps> = ({
  userId,
  onLanguageSelected,
}) => {
  const [languages, setLanguages] = useState<LanguageOption[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchLanguages = async () => {
      const { data } = await supabase
        .from('i18n_languages')
        .select('code, name, native_name')
        .eq('is_active', true)
        .order('position');
      if (data) setLanguages(data);
    };
    fetchLanguages();
  }, []);

  const handleConfirm = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ training_language: selected })
        .eq('user_id', userId);

      if (error) throw error;
      onLanguageSelected(selected);
    } catch (error) {
      console.error('Error saving training language:', error);
    } finally {
      setSaving(false);
      setShowConfirm(false);
    }
  };

  const getFlagUrl = (code: string) =>
    `https://flagcdn.com/24x18/${code === 'en' ? 'gb' : code}.png`;

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Card className="max-w-lg w-full mx-4">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <GraduationCap className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-xl">Wybierz język szkolenia</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Wybierz język, w którym chcesz realizować szkolenia. Twój postęp będzie liczony
            wyłącznie na podstawie materiałów w wybranym języku.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setSelected(lang.code)}
                className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left ${
                  selected === lang.code
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                }`}
              >
                <img
                  src={getFlagUrl(lang.code)}
                  alt={lang.name}
                  className="w-6 h-4 object-cover rounded-sm"
                />
                <div className="flex-1">
                  <span className="font-medium">{lang.native_name}</span>
                  <span className="text-sm text-muted-foreground ml-2">({lang.name})</span>
                </div>
                {selected === lang.code && (
                  <Badge variant="default" className="text-xs">Wybrany</Badge>
                )}
              </button>
            ))}
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <p className="text-xs text-destructive">
              <strong>Uwaga:</strong> Wyboru języka szkolenia nie można później zmienić.
              Zmianę może wykonać tylko administrator.
            </p>
          </div>

          <Button
            className="w-full"
            disabled={!selected}
            onClick={() => setShowConfirm(true)}
          >
            <Globe className="h-4 w-4 mr-2" />
            Zatwierdź wybór języka
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Potwierdzenie wyboru języka</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz wybrać język{' '}
              <strong>
                {languages.find((l) => l.code === selected)?.native_name}
              </strong>
              ? Tego wyboru nie można cofnąć — zmianę może wykonać tylko administrator.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={saving}>
              {saving ? 'Zapisywanie...' : 'Tak, potwierdzam'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
