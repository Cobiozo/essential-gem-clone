import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Eye, EyeOff } from 'lucide-react';
import { DeviceType } from './DevicePreview';

interface ResponsiveSettings {
  hidden: {
    mobile: boolean;
    tablet: boolean;
    desktop: boolean;
  };
  width: {
    mobile: string;
    tablet: string;
    desktop: string;
  };
  textSize: {
    mobile: string;
    tablet: string;
    desktop: string;
  };
  spacing: {
    mobile: string;
    tablet: string;
    desktop: string;
  };
}

interface ResponsiveControlsProps {
  settings: ResponsiveSettings;
  currentDevice: DeviceType;
  onSettingsChange: (settings: ResponsiveSettings) => void;
  className?: string;
}

export const ResponsiveControls: React.FC<ResponsiveControlsProps> = ({
  settings,
  currentDevice,
  onSettingsChange,
  className,
}) => {
  const updateSetting = (
    category: keyof ResponsiveSettings,
    device: DeviceType,
    value: string | boolean
  ) => {
    const newSettings = {
      ...settings,
      [category]: {
        ...settings[category],
        [device]: value,
      },
    };
    onSettingsChange(newSettings);
  };

  const textSizes = [
    { value: 'text-xs', label: 'Extra Small' },
    { value: 'text-sm', label: 'Small' },
    { value: 'text-base', label: 'Base' },
    { value: 'text-lg', label: 'Large' },
    { value: 'text-xl', label: 'Extra Large' },
    { value: 'text-2xl', label: '2X Large' },
    { value: 'text-3xl', label: '3X Large' },
  ];

  const spacingOptions = [
    { value: 'p-0', label: 'None' },
    { value: 'p-2', label: 'Small' },
    { value: 'p-4', label: 'Medium' },
    { value: 'p-6', label: 'Large' },
    { value: 'p-8', label: 'Extra Large' },
  ];

  const widthOptions = [
    { value: 'w-full', label: 'Full Width' },
    { value: 'w-3/4', label: '75%' },
    { value: 'w-1/2', label: '50%' },
    { value: 'w-1/3', label: '33%' },
    { value: 'w-1/4', label: '25%' },
  ];

  return (
    <div className={className}>
      <div className="space-y-4 p-4 bg-muted/20 rounded-lg border">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">
            Responsive Settings - {currentDevice.charAt(0).toUpperCase() + currentDevice.slice(1)}
          </h3>
          <div className="flex items-center gap-2">
            <Switch
              checked={!settings.hidden[currentDevice]}
              onCheckedChange={(checked) => 
                updateSetting('hidden', currentDevice, !checked)
              }
            />
            {settings.hidden[currentDevice] ? (
              <EyeOff className="w-4 h-4 text-muted-foreground" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </div>
        </div>

        {!settings.hidden[currentDevice] && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`width-${currentDevice}`}>Width</Label>
              <Select
                value={settings.width[currentDevice]}
                onValueChange={(value) => updateSetting('width', currentDevice, value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {widthOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`text-size-${currentDevice}`}>Text Size</Label>
              <Select
                value={settings.textSize[currentDevice]}
                onValueChange={(value) => updateSetting('textSize', currentDevice, value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {textSizes.map((size) => (
                    <SelectItem key={size.value} value={size.value}>
                      {size.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`spacing-${currentDevice}`}>Spacing</Label>
              <Select
                value={settings.spacing[currentDevice]}
                onValueChange={(value) => updateSetting('spacing', currentDevice, value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {spacingOptions.map((spacing) => (
                    <SelectItem key={spacing.value} value={spacing.value}>
                      {spacing.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const defaultResponsiveSettings: ResponsiveSettings = {
  hidden: {
    mobile: false,
    tablet: false,
    desktop: false,
  },
  width: {
    mobile: 'w-full',
    tablet: 'w-full',
    desktop: 'w-full',
  },
  textSize: {
    mobile: 'text-sm',
    tablet: 'text-base',
    desktop: 'text-lg',
  },
  spacing: {
    mobile: 'p-2',
    tablet: 'p-4',
    desktop: 'p-6',
  },
};