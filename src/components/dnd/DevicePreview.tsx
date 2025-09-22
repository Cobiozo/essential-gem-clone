import React from 'react';
import { Button } from '@/components/ui/button';
import { Monitor, Tablet, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';

export type DeviceType = 'desktop' | 'tablet' | 'mobile';

interface DevicePreviewProps {
  currentDevice: DeviceType;
  onDeviceChange: (device: DeviceType) => void;
  className?: string;
}

export const DevicePreview: React.FC<DevicePreviewProps> = ({
  currentDevice,
  onDeviceChange,
  className,
}) => {
  const devices = [
    { type: 'desktop' as DeviceType, icon: Monitor, label: 'Desktop', width: '100%' },
    { type: 'tablet' as DeviceType, icon: Tablet, label: 'Tablet', width: '768px' },
    { type: 'mobile' as DeviceType, icon: Smartphone, label: 'Mobile', width: '375px' },
  ];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-sm font-medium text-muted-foreground">Preview:</span>
      {devices.map(({ type, icon: Icon, label }) => (
        <Button
          key={type}
          variant={currentDevice === type ? "default" : "outline"}
          size="sm"
          onClick={() => onDeviceChange(type)}
          className="gap-2"
        >
          <Icon className="w-4 h-4" />
          <span className="hidden sm:inline">{label}</span>
        </Button>
      ))}
    </div>
  );
};

interface DeviceFrameProps {
  device: DeviceType;
  children: React.ReactNode;
  className?: string;
}

export const DeviceFrame: React.FC<DeviceFrameProps> = ({
  device,
  children,
  className,
}) => {
  const getFrameStyles = () => {
    switch (device) {
      case 'mobile':
        return {
          maxWidth: '375px',
          minHeight: '667px',
          margin: '0 auto',
          border: '8px solid #1f2937',
          borderRadius: '20px',
          backgroundColor: '#000',
          padding: '4px',
        };
      case 'tablet':
        return {
          maxWidth: '768px',
          minHeight: '1024px',
          margin: '0 auto',
          border: '6px solid #374151',
          borderRadius: '12px',
          backgroundColor: '#1f2937',
          padding: '2px',
        };
      case 'desktop':
      default:
        return {
          width: '100%',
          minHeight: '600px',
        };
    }
  };

  const frameStyles = getFrameStyles();

  if (device === 'desktop') {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={cn("transition-all duration-300", className)}>
      <div style={frameStyles}>
        <div className="w-full h-full bg-background rounded-lg overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
};