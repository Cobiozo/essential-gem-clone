import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Settings, Users, TrendingUp, UserCheck } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

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
  const { tf } = useLanguage();
  const clients = Math.round(followers * (conversionRate / 100));

  const formatFollowers = (value: number): string => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)} ${tf('calc.inf.million', 'mln')}`;
    } else if (value >= 1000) {
      return `${Math.round(value / 1000)} ${tf('calc.inf.thousand', 'tys.')}`;
    }
    return value.toString();
  };

  const [followersInput, setFollowersInput] = useState(followers.toString());
  const [conversionInput, setConversionInput] = useState(conversionRate.toFixed(1));

  useEffect(() => {
    setFollowersInput(followers.toString());
  }, [followers]);

  useEffect(() => {
    setConversionInput(conversionRate.toFixed(1));
  }, [conversionRate]);

  const handleFollowersInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setFollowersInput(value);
  };

  const handleFollowersBlur = () => {
    const parsed = parseInt(followersInput);
    if (isNaN(parsed) || parsed < followersMin) {
      onFollowersChange(followersMin);
    } else if (parsed > followersMax) {
      onFollowersChange(followersMax);
    } else {
      onFollowersChange(parsed);
    }
  };

  const handleConversionInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9.]/g, '');
    setConversionInput(value);
  };

  const handleConversionBlur = () => {
    const parsed = parseFloat(conversionInput);
    if (isNaN(parsed) || parsed < conversionMin) {
      onConversionChange(conversionMin);
    } else if (parsed > conversionMax) {
      onConversionChange(conversionMax);
    } else {
      onConversionChange(parsed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, onBlur: () => void) => {
    if (e.key === 'Enter') {
      onBlur();
      e.currentTarget.blur();
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="h-4 w-4 text-emerald-600" />
            {tf('calc.inf.parameters', 'Parametry')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                {tf('calc.inf.followersBase', 'Liczba Obserwujących / Baza kontaktów')}
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
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={followersInput}
                onChange={handleFollowersInputChange}
                onBlur={handleFollowersBlur}
                onKeyDown={(e) => handleKeyDown(e, handleFollowersBlur)}
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

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                {tf('calc.inf.estimatedConversion', 'Szacowana Konwersja (%)')}
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
                type="text"
                inputMode="numeric"
                pattern="[0-9.]*"
                value={conversionInput}
                onChange={handleConversionInputChange}
                onBlur={handleConversionBlur}
                onKeyDown={(e) => handleKeyDown(e, handleConversionBlur)}
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

      <Card className="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800">
        <CardContent className="py-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <UserCheck className="h-4 w-4 text-emerald-600" />
              <span className="text-sm text-emerald-700 dark:text-emerald-400">
                {tf('calc.inf.acquiredClients', 'Pozyskanych Klientów')}
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
