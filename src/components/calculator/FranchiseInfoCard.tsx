import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Info, CheckCircle, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export function FranchiseInfoCard() {
  const { t } = useLanguage();

  const benefits = [
    t('calculator.benefit1') || 'Prowizja od każdego pozyskanego klienta',
    t('calculator.benefit2') || 'Bonusy wolumenowe za osiągnięcie progów',
    t('calculator.benefit3') || 'Dochód pasywny z przedłużeń subskrypcji',
    t('calculator.benefit4') || 'Bonusy za pierwsze i drugie przedłużenie'
  ];

  const notes = [
    t('calculator.note1') || 'Kalkulacja ma charakter szacunkowy',
    t('calculator.note2') || 'Rzeczywiste wyniki mogą się różnić w zależności od zaangażowania'
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Info className="h-5 w-5 text-primary" />
          {t('calculator.franchiseInfo') || 'Model franczyzowy'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">
            {t('calculator.whatYouGet') || 'Co otrzymujesz:'}
          </p>
          <ul className="space-y-2">
            {benefits.map((benefit, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg bg-muted/50 p-3 space-y-2">
          <p className="text-sm font-medium flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            {t('calculator.importantNotes') || 'Ważne informacje:'}
          </p>
          <ul className="space-y-1">
            {notes.map((note, index) => (
              <li key={index} className="text-xs text-muted-foreground">
                • {note}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
