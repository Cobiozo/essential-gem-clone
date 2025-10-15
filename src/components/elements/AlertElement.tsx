import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Info, CheckCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AlertElementProps {
  content: string;
  title?: string;
  variant?: 'default' | 'info' | 'success' | 'warning' | 'destructive';
  className?: string;
}

const variantIcons = {
  default: AlertCircle,
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  destructive: AlertCircle,
};

export const AlertElement: React.FC<AlertElementProps> = ({
  content,
  title,
  variant = 'default',
  className,
}) => {
  const Icon = variantIcons[variant];

  return (
    <Alert variant={variant === 'default' ? undefined : variant as any} className={className}>
      <Icon className="h-4 w-4" />
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription>{content}</AlertDescription>
    </Alert>
  );
};
