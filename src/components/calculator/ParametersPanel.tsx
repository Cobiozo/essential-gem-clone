import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Users, TrendingUp, UserCheck } from 'lucide-react';

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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5 text-primary" />
          Parametry
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Followers Slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Obserwujący
            </Label>
            <span className="text-lg font-semibold text-primary">
              {followers.toLocaleString('pl-PL')}
            </span>
          </div>
          <Slider
            value={[followers]}
            onValueChange={(value) => onFollowersChange(value[0])}
            min={followersMin}
            max={followersMax}
            step={100}
            className="py-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{followersMin.toLocaleString('pl-PL')}</span>
            <span>{followersMax.toLocaleString('pl-PL')}</span>
          </div>
        </div>

        {/* Conversion Rate Slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Współczynnik konwersji
            </Label>
            <span className="text-lg font-semibold text-primary">
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
            <span>{conversionMax}%</span>
          </div>
        </div>

        {/* Clients Result */}
        <div className="rounded-lg bg-muted/50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              <span className="font-medium">
                Szacowana liczba klientów
              </span>
            </div>
            <span className="text-2xl font-bold text-primary">
              {clients.toLocaleString('pl-PL')}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
