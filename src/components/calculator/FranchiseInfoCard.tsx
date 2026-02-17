import { Card, CardContent } from '@/components/ui/card';
import { Building2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export function FranchiseInfoCard() {
  const { tf } = useLanguage();

  return (
    <Card className="bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-slate-200 dark:bg-slate-700">
            <Building2 className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          </div>
          <div className="space-y-1">
            <h4 className="font-semibold text-slate-700 dark:text-slate-300">{tf('calc.inf.franchiseModel', 'Model Franczyzowy')}</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {tf('calc.inf.franchiseDesc', 'System afiliacyjny oparty na prowizjach startowych, dochodzie pasywnym z przedłużeń oraz bonusach wolumenowych. Kalkulacja ma charakter szacunkowy.')}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
