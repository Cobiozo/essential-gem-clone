import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { getReflinkStatus, getDaysUntilExpiry, ReflinkStatus } from './types';

interface ReflinkStatusBadgeProps {
  expiresAt: string;
}

export const ReflinkStatusBadge: React.FC<ReflinkStatusBadgeProps> = ({ expiresAt }) => {
  const status = getReflinkStatus(expiresAt);
  const daysLeft = getDaysUntilExpiry(expiresAt);

  const config: Record<ReflinkStatus, { icon: React.ReactNode; label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    active: {
      icon: <CheckCircle className="w-3 h-3" />,
      label: `${daysLeft} dni`,
      variant: 'default',
    },
    expiring_soon: {
      icon: <AlertTriangle className="w-3 h-3" />,
      label: `${daysLeft} dni`,
      variant: 'secondary',
    },
    expired: {
      icon: <Clock className="w-3 h-3" />,
      label: 'Wygasł',
      variant: 'destructive',
    },
  };

  const { icon, label, variant } = config[status];

  return (
    <Badge variant={variant} className="gap-1">
      {icon}
      {label}
    </Badge>
  );
};
