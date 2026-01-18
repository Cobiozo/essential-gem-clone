import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Info, CheckCircle, AlertCircle } from 'lucide-react';

const benefits = [
  'Prowizja od każdego pozyskanego klienta',
  'Bonusy wolumenowe za osiągnięcie progów',
  'Dochód pasywny z przedłużeń subskrypcji',
  'Bonusy za pierwsze i drugie przedłużenie'
];

const notes = [
  'Kalkulacja ma charakter szacunkowy',
  'Rzeczywiste wyniki mogą się różnić w zależności od zaangażowania'
];

export function FranchiseInfoCard() {

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Info className="h-5 w-5 text-primary" />
          Model franczyzowy
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">
            Co otrzymujesz:
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
            Ważne informacje:
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
