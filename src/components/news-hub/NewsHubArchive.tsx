import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Archive, X } from 'lucide-react';
import type { NewsHubPost } from '@/types/newsHub';

const MONTHS_PL = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
];

interface Props {
  posts: NewsHubPost[];
  value: string | null;
  onChange: (monthKey: string | null) => void;
}

export const NewsHubArchive: React.FC<Props> = ({ posts, value, onChange }) => {
  const groups = useMemo(() => {
    const map = new Map<string, number>();
    posts.forEach((p) => {
      const src = p.published_at || p.created_at;
      if (!src) return;
      const d = new Date(src);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([key, count]) => {
        const [y, m] = key.split('-');
        return { key, label: `${MONTHS_PL[Number(m) - 1]} ${y}`, count };
      });
  }, [posts]);

  return (
    <aside className="rounded-2xl border border-border bg-card p-4 lg:sticky lg:top-20">
      <div className="flex items-center justify-between mb-3">
        <h3 className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <Archive className="h-4 w-4 text-primary" />
          Archiwum
        </h3>
        {value && (
          <button
            onClick={() => onChange(null)}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            title="Wyczyść filtr"
          >
            <X className="h-3 w-3" /> Wyczyść
          </button>
        )}
      </div>

      {groups.length === 0 ? (
        <p className="text-xs text-muted-foreground">Brak archiwum.</p>
      ) : (
        <ul className="space-y-1 max-h-[60vh] overflow-y-auto pr-1">
          {groups.map((g) => {
            const active = value === g.key;
            return (
              <li key={g.key}>
                <button
                  onClick={() => onChange(active ? null : g.key)}
                  className={cn(
                    'w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                    active
                      ? 'bg-primary/15 text-primary font-semibold'
                      : 'text-foreground/80 hover:bg-muted hover:text-primary',
                  )}
                >
                  <span className="truncate">{g.label}</span>
                  <span
                    className={cn(
                      'text-[10px] font-mono px-1.5 py-0.5 rounded-full',
                      active ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {g.count}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
};

export default NewsHubArchive;
