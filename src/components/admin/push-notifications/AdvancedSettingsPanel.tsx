import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Settings, Save, Loader2, VolumeX, MousePointerClick, Vibrate } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PushNotificationConfig {
  id: string;
  vibration_pattern?: string | null;
  ttl_seconds?: number | null;
  require_interaction?: boolean | null;
  silent?: boolean | null;
  [key: string]: any;
}

interface AdvancedSettingsPanelProps {
  config: PushNotificationConfig;
  onUpdate: (updates: Partial<PushNotificationConfig>) => void;
  isSaving?: boolean;
}

const vibrationPatterns = [
  { id: 'short', name: 'Krótka', description: '100ms' },
  { id: 'standard', name: 'Standardowa', description: '100-50-100ms' },
  { id: 'long', name: 'Długa', description: '200-100-200-100-200ms' },
  { id: 'urgent', name: 'Pilna', description: '100-30-100-30-100-30-100ms' },
  { id: 'off', name: 'Wyłączona', description: 'Brak wibracji' },
];

const ttlOptions = [
  { value: 3600, label: '1 godzina' },
  { value: 14400, label: '4 godziny' },
  { value: 43200, label: '12 godzin' },
  { value: 86400, label: '24 godziny (Domyślny)' },
  { value: 172800, label: '48 godzin' },
  { value: 604800, label: '7 dni' },
];

export const AdvancedSettingsPanel: React.FC<AdvancedSettingsPanelProps> = ({
  config,
  onUpdate,
  isSaving = false,
}) => {
  const [localVibration, setLocalVibration] = useState(config.vibration_pattern || 'standard');
  const [localTTL, setLocalTTL] = useState(config.ttl_seconds || 86400);
  const [localRequireInteraction, setLocalRequireInteraction] = useState(config.require_interaction || false);
  const [localSilent, setLocalSilent] = useState(config.silent || false);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync with config changes
  useEffect(() => {
    setLocalVibration(config.vibration_pattern || 'standard');
    setLocalTTL(config.ttl_seconds || 86400);
    setLocalRequireInteraction(config.require_interaction || false);
    setLocalSilent(config.silent || false);
    setHasChanges(false);
  }, [config]);

  // Track changes
  useEffect(() => {
    const changed = 
      localVibration !== (config.vibration_pattern || 'standard') ||
      localTTL !== (config.ttl_seconds || 86400) ||
      localRequireInteraction !== (config.require_interaction || false) ||
      localSilent !== (config.silent || false);
    setHasChanges(changed);
  }, [localVibration, localTTL, localRequireInteraction, localSilent, config]);

  const handleSave = () => {
    onUpdate({
      vibration_pattern: localVibration,
      ttl_seconds: localTTL,
      require_interaction: localRequireInteraction,
      silent: localSilent,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Zaawansowane ustawienia powiadomień
        </CardTitle>
        <CardDescription>
          Konfiguruj wzorzec wibracji, czas życia powiadomień i inne opcje
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Vibration Pattern */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Vibrate className="w-4 h-4" />
            Wzorzec wibracji
          </Label>
          <RadioGroup
            value={localVibration}
            onValueChange={setLocalVibration}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3"
          >
            {vibrationPatterns.map((pattern) => (
              <div key={pattern.id}>
                <RadioGroupItem
                  value={pattern.id}
                  id={`vibration-${pattern.id}`}
                  className="peer sr-only"
                />
                <Label
                  htmlFor={`vibration-${pattern.id}`}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer transition-colors",
                    localVibration === pattern.id && "border-primary bg-primary/5"
                  )}
                >
                  <span className="font-medium text-sm">{pattern.name}</span>
                  <span className="text-xs text-muted-foreground mt-1">{pattern.description}</span>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* TTL Dropdown */}
        <div className="space-y-2">
          <Label htmlFor="ttl-select">Czas życia powiadomienia (TTL)</Label>
          <Select
            value={localTTL.toString()}
            onValueChange={(value) => setLocalTTL(parseInt(value))}
          >
            <SelectTrigger id="ttl-select" className="w-full md:w-[300px]">
              <SelectValue placeholder="Wybierz czas życia" />
            </SelectTrigger>
            <SelectContent>
              {ttlOptions.map((option) => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Jak długo powiadomienie będzie próbować dotrzeć do urządzenia offline
          </p>
        </div>

        {/* Require Interaction Toggle */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <MousePointerClick className="w-5 h-5 text-muted-foreground" />
            <div className="space-y-0.5">
              <Label htmlFor="require-interaction" className="font-medium cursor-pointer">
                Wymagaj interakcji
              </Label>
              <p className="text-sm text-muted-foreground">
                Powiadomienie pozostanie widoczne do momentu kliknięcia lub zamknięcia
              </p>
            </div>
          </div>
          <Switch
            id="require-interaction"
            checked={localRequireInteraction}
            onCheckedChange={setLocalRequireInteraction}
          />
        </div>

        {/* Silent Toggle */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <VolumeX className="w-5 h-5 text-muted-foreground" />
            <div className="space-y-0.5">
              <Label htmlFor="silent" className="font-medium cursor-pointer">
                Ciche powiadomienia
              </Label>
              <p className="text-sm text-muted-foreground">
                Powiadomienia bez dźwięku (nadal z wibracją jeśli włączona)
              </p>
            </div>
          </div>
          <Switch
            id="silent"
            checked={localSilent}
            onCheckedChange={setLocalSilent}
          />
        </div>

        {/* Save Button */}
        <Button 
          onClick={handleSave} 
          disabled={!hasChanges || isSaving}
          className="w-full md:w-auto"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Zapisz ustawienia
        </Button>
      </CardContent>
    </Card>
  );
};
