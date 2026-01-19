import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Settings, Users, TrendingUp, UserCheck } from 'lucide-react';

interface ParametersPanelProps {
  followers: number;
  conversionRate: number;
  onFollowersChange: (value: number) => void;
  onConversionChange: (value: number) => void;
  followersMin: number;
  followersMax: number;
  conversionMin: number;
  conversionMax: number;
}

const formatFollowers = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)} mln`;
  } else if (value >= 1000) {
    return `${Math.round(value / 1000)} tys.`;
  }
  return value.toString();
};

export function ParametersPanel({
  followers,
  conversionRate,
  onFollowersChange,
  onConversionChange,
  followersMin,
  followersMax,
  conversionMin,
  conversionMax
}: ParametersPanelProps) {
  const clients = Math.round(followers * (conversionRate / 100));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="h-4 w-4 text-emerald-600" />
            Parametry
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Followers Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Liczba Obserwujących / Baza kontaktów
              </span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-emerald-600">
                {formatFollowers(followers)}
              </span>
            </div>
            <Slider
              value={[followers]}
              onValueChange={(value) => onFollowersChange(value[0])}
              min={followersMin}
              max={followersMax}
              step={1000}
              className="py-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatFollowers(followersMin)}</span>
              <span>{formatFollowers(Math.round(followersMax / 2))}</span>
              <span>{formatFollowers(followersMax)}</span>
            </div>
          </div>

          {/* Conversion Rate Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                Szacowana Konwersja (%)
              </span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-emerald-600">
                {conversionRate.toFixed(1)}%
              </span>
            </div>
            <Slider
              value={[conversionRate]}
              onValueChange={(value) => onConversionChange(value[0])}
              min={conversionMin}
              max={conversionMax}
              step={0.1}
              className="py-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{conversionMin}%</span>
              <span>{((conversionMax + conversionMin) / 2).toFixed(1)}%</span>
              <span>{conversionMax}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clients Result - Separate Card */}
      <Card className="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800">
        <CardContent className="py-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <UserCheck className="h-4 w-4 text-emerald-600" />
              <span className="text-sm text-emerald-700 dark:text-emerald-400">
                Pozyskanych Klientów
              </span>
            </div>
            <p className="text-4xl font-bold text-emerald-600">
              {clients.toLocaleString('pl-PL')}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
