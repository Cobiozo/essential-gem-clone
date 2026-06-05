import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Search, Loader2, Newspaper, Settings, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useNewsHubPosts, useNewsHubCategories } from '@/hooks/useNewsHub';
import { useNewsHubVisibility } from '@/hooks/useNewsHubVisibility';
import { BentoGrid } from '@/components/news-hub/BentoGrid';
import { useNewsHubSettings } from '@/hooks/useNewsHubSettings';
import { useNewsHubBanner } from '@/hooks/useNewsHubBanner';
import { NewsHubBanner } from '@/components/news-hub/NewsHubBanner';
import { NewsHubArchive } from '@/components/news-hub/NewsHubArchive';
import type { NewsHubPostType } from '@/types/newsHub';
import { POST_TYPE_LABELS } from '@/types/newsHub';

type SortMode = 'pinned-first' | 'newest' | 'oldest';

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
  const { isModuleVisible, loading: visLoading } = useNewsHubVisibility();
  const [type, setType] = useState<NewsHubPostType | 'all'>('all');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('pinned-first');
  const [monthKey, setMonthKey] = useState<string | null>(null);

  const { categories } = useNewsHubCategories();
  const { posts, loading, refresh } = useNewsHubPosts({ type, categoryId, search, adminMode: isAdmin });
  const { adminLayout } = useNewsHubSettings();
  const { config: bannerConfig } = useNewsHubBanner();

  const { pinned, regular } = useMemo(() => {
    let filtered = posts;
    if (monthKey) {
      filtered = filtered.filter((p) => {
        const src = p.published_at || p.created_at;
        if (!src) return false;
        const d = new Date(src);
        if (isNaN(d.getTime())) return false;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return key === monthKey;
      });
    }
    const sorter = (a: typeof posts[number], b: typeof posts[number]) => {
      const da = a.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : 0;
      return sortMode === 'oldest' ? da - db : db - da;
    };
    if (sortMode === 'pinned-first') {
      return {
        pinned: filtered.filter((p) => p.is_pinned).slice().sort(sorter),
        regular: filtered.filter((p) => !p.is_pinned).slice().sort(sorter),
      };
    }
    return { pinned: [] as typeof posts, regular: filtered.slice().sort(sorter) };
  }, [posts, monthKey, sortMode]);

  if (visLoading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  if (!isModuleVisible) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-4">
        <EyeOff className="h-12 w-12 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Brak dostępu</h1>
        <p className="text-muted-foreground mb-6 text-center max-w-md">
          Centrum Aktualności jest obecnie niedostępne dla Twojego konta.
        </p>
        <Link to="/dashboard">
          <Button variant="outline" className="gap-2"><ArrowLeft className="h-4 w-4" /> Wróć na stronę główną</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="container max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium hover:text-primary">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Strona główna</span>
            <span className="sm:hidden">Pulpit</span>
          </Link>
          {isAdmin && (
            <Link to="/admin/news-hub">
              <Button variant="outline" size="sm" className="gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Zarządzaj</span>
              </Button>
            </Link>
          )}
        </div>
      </header>


      <NewsHubBanner config={bannerConfig} />

      <section className="container max-w-7xl mx-auto px-4 pb-4">
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Szukaj..."
              className="pl-9 h-9"
            />
          </div>

          <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
            <SelectTrigger className="h-9 w-[170px]"><SelectValue placeholder="Sortuj" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pinned-first">Najpierw przypięte</SelectItem>
              <SelectItem value="newest">Od najnowszych</SelectItem>
              <SelectItem value="oldest">Od najstarszych</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={categoryId ?? 'all'}
            onValueChange={(v) => setCategoryId(v === 'all' ? null : v)}
          >
            <SelectTrigger className="h-9 w-[180px]"><SelectValue placeholder="Kategoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie kategorie</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  <span className="inline-flex items-center gap-2">
                    {c.color && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />}
                    {c.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={type} onValueChange={(v) => setType(v as NewsHubPostType | 'all')}>
            <SelectTrigger className="h-9 w-[150px]"><SelectValue placeholder="Typ" /></SelectTrigger>
            <SelectContent>
              {TYPE_TABS.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      <section className="container max-w-7xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-6 items-start">
          <div className="space-y-8 min-w-0">
            {loading && (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}

            {!loading && pinned.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Przypięte</h2>
                <BentoGrid posts={pinned} onChanged={refresh} layout={adminLayout} adminActions={false} />
              </div>
            )}

            {!loading && regular.length > 0 && (
              <div>
                {pinned.length > 0 && (
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Najnowsze</h2>
                )}
                <BentoGrid posts={regular} onChanged={refresh} layout={adminLayout} adminActions={false} />
              </div>
            )}

            {!loading && pinned.length === 0 && regular.length === 0 && (
              <div className="text-center py-20 text-muted-foreground">
                <Newspaper className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Brak aktualności{monthKey ? ' w wybranym miesiącu' : ''}.</p>
              </div>
            )}
          </div>

          <NewsHubArchive posts={posts} value={monthKey} onChange={setMonthKey} />
        </div>
      </section>
    </div>
  );
};

export default NewsHubPage;
