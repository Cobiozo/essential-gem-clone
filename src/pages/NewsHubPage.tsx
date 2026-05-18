import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Search, Loader2, Newspaper, Settings } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useNewsHubPosts, useNewsHubCategories } from '@/hooks/useNewsHub';
import { BentoGrid } from '@/components/news-hub/BentoGrid';
import type { NewsHubPostType } from '@/types/newsHub';
import { POST_TYPE_LABELS } from '@/types/newsHub';

const TYPE_TABS: Array<{ value: NewsHubPostType | 'all'; label: string }> = [
  { value: 'all', label: 'Wszystko' },
  { value: 'announcement', label: POST_TYPE_LABELS.announcement },
  { value: 'article', label: POST_TYPE_LABELS.article },
  { value: 'video', label: POST_TYPE_LABELS.video },
  { value: 'gallery', label: POST_TYPE_LABELS.gallery },
  { value: 'file', label: POST_TYPE_LABELS.file },
  { value: 'link', label: POST_TYPE_LABELS.link },
];

const NewsHubPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const [type, setType] = useState<NewsHubPostType | 'all'>('all');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const { categories } = useNewsHubCategories();
  const { posts, loading, refresh } = useNewsHubPosts({ type, categoryId, search, adminMode: isAdmin });

  const { pinned, regular } = useMemo(() => {
    const pinned = posts.filter((p) => p.is_pinned);
    const regular = posts.filter((p) => !p.is_pinned);
    return { pinned, regular };
  }, [posts]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="container max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium hover:text-primary">
            <ArrowLeft className="h-4 w-4" /> Strona główna
          </Link>
          {isAdmin && (
            <Link to="/admin/news-hub">
              <Button variant="outline" size="sm" className="gap-2">
                <Settings className="h-4 w-4" /> Zarządzaj
              </Button>
            </Link>
          )}
        </div>
      </header>

      <section className="container max-w-7xl mx-auto px-4 pt-10 pb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/60 p-3 shadow-lg">
            <Newspaper className="h-7 w-7 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Centrum Aktualności</h1>
            <p className="text-muted-foreground text-sm md:text-base">Ogłoszenia, artykuły, wideo, pliki i wiele więcej.</p>
          </div>
        </div>
        {isAdmin && (
          <p className="text-xs text-muted-foreground mt-2">
            Najedź na kafelek, aby zobaczyć szybkie akcje (przypnij / ukryj / edytuj / usuń). Kliknij kafelek, aby otworzyć post.
          </p>
        )}
      </section>

      <section className="container max-w-7xl mx-auto px-4 pb-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Szukaj..." className="pl-9" />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCategoryId(null)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium border transition',
                !categoryId ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:border-primary/50',
              )}
            >
              Wszystkie kategorie
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategoryId(c.id)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium border transition',
                  categoryId === c.id ? 'text-primary-foreground border-transparent' : 'bg-card text-foreground border-border hover:border-primary/50',
                )}
                style={categoryId === c.id ? { backgroundColor: c.color || undefined } : undefined}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6 overflow-x-auto">
          {TYPE_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setType(t.value)}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-medium transition whitespace-nowrap',
                type === t.value ? 'bg-primary text-primary-foreground shadow-md' : 'bg-card hover:bg-muted text-foreground',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      <section className="container max-w-7xl mx-auto px-4 pb-16 space-y-8">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && pinned.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Przypięte</h2>
            <BentoGrid posts={pinned} onChanged={refresh} />
          </div>
        )}

        {!loading && regular.length > 0 && (
          <div>
            {pinned.length > 0 && (
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Najnowsze</h2>
            )}
            <BentoGrid posts={regular} onChanged={refresh} />
          </div>
        )}

        {!loading && posts.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <Newspaper className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Brak aktualności w tej kategorii.</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default NewsHubPage;
