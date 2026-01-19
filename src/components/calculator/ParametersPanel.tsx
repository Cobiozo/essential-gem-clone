import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
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

  const handleFollowersInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || followersMin;
    onFollowersChange(Math.min(Math.max(value, followersMin), followersMax));
  };

  const handleConversionInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || conversionMin;
    onConversionChange(Math.min(Math.max(value, conversionMin), conversionMax));
  };

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
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Slider
                  value={[followers]}
                  onValueChange={(value) => onFollowersChange(value[0])}
                  min={followersMin}
                  max={followersMax}
                  step={1000}
                  className="py-2"
                />
              </div>
              <Input
                type="number"
                value={followers}
                onChange={handleFollowersInput}
                min={followersMin}
                max={followersMax}
                step={1000}
                className="w-24 text-center text-sm"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex justify-between text-xs text-muted-foreground flex-1 mr-24">
                <span>{formatFollowers(followersMin)}</span>
                <span>{formatFollowers(Math.round(followersMax / 2))}</span>
                <span>{formatFollowers(followersMax)}</span>
              </div>
            </div>
            <div className="text-center">
              <span className="text-2xl font-bold text-emerald-600 transition-all duration-300">
                {formatFollowers(followers)}
              </span>
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
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Slider
                  value={[conversionRate]}
                  onValueChange={(value) => onConversionChange(value[0])}
                  min={conversionMin}
                  max={conversionMax}
                  step={0.1}
                  className="py-2"
                />
              </div>
              <Input
                type="number"
                value={conversionRate.toFixed(1)}
                onChange={handleConversionInput}
                min={conversionMin}
                max={conversionMax}
                step={0.1}
                className="w-24 text-center text-sm"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex justify-between text-xs text-muted-foreground flex-1 mr-24">
                <span>{conversionMin}%</span>
                <span>{((conversionMax + conversionMin) / 2).toFixed(1)}%</span>
                <span>{conversionMax}%</span>
              </div>
            </div>
            <div className="text-center">
              <span className="text-2xl font-bold text-emerald-600 transition-all duration-300">
                {conversionRate.toFixed(1)}%
              </span>
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
            <p className="text-4xl font-bold text-emerald-600 transition-all duration-300">
              {clients.toLocaleString('pl-PL')}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
