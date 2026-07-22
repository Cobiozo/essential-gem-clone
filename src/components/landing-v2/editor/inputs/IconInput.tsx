import React, { useMemo, useState } from 'react';
import * as LucideIcons from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const POPULAR = [
  'Sparkles', 'HeartPulse', 'Heart', 'Users', 'User', 'Star', 'Award', 'Trophy',
  'GraduationCap', 'BookOpen', 'Book', 'Play', 'Video', 'Camera', 'Image',
  'Zap', 'Rocket', 'Lightbulb', 'Target', 'CheckCircle', 'Check', 'Shield',
  'Clock', 'Calendar', 'Bell', 'Mail', 'MessageCircle', 'Phone',
  'Home', 'Building', 'Store', 'Globe', 'Map', 'MapPin', 'Compass',
  'Leaf', 'Trees', 'Sun', 'Moon', 'Cloud', 'Droplet', 'Flame',
  'TrendingUp', 'BarChart', 'PieChart', 'Activity', 'Gauge',
  'ShoppingCart', 'Gift', 'Tag', 'Wallet', 'DollarSign', 'CreditCard',
  'Smartphone', 'Laptop', 'Monitor', 'Wifi', 'Bluetooth',
  'Music', 'Headphones', 'Mic', 'Volume2',
  'ArrowRight', 'ArrowUp', 'Plus', 'Minus', 'X',
];

export function IconInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [q, setQ] = useState('');
  const allNames = useMemo(
    () =>
      Object.keys(LucideIcons).filter(
        (k) =>
          /^[A-Z]/.test(k) &&
          typeof (LucideIcons as any)[k] === 'object' &&
          k !== 'Icon' &&
          k !== 'createLucideIcon',
      ),
    [],
  );
  const filtered = q
    ? allNames.filter((n) => n.toLowerCase().includes(q.toLowerCase())).slice(0, 60)
    : POPULAR;

  const Selected = (LucideIcons as any)[value] || LucideIcons.Sparkles;

  return (
    <div className="space-y-2">
      <Label className="text-xs">Ikona</Label>
      <div className="flex items-center gap-2">
        <div className="w-11 h-11 border rounded flex items-center justify-center bg-neutral-50">
          <Selected className="w-6 h-6" strokeWidth={1.5} />
        </div>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Nazwa ikony (np. HeartPulse)"
          className="h-9 text-xs"
        />
      </div>
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Szukaj ikony..."
        className="h-8 text-xs"
      />
      <div className="grid grid-cols-8 gap-1 max-h-48 overflow-auto border rounded p-2 bg-neutral-50/50">
        {filtered.map((n) => {
          const Ic = (LucideIcons as any)[n];
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              title={n}
              className={`aspect-square rounded flex items-center justify-center hover:bg-blue-100 transition ${
                value === n ? 'bg-blue-500 text-white' : 'bg-white border'
              }`}
            >
              <Ic className="w-4 h-4" strokeWidth={1.5} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
