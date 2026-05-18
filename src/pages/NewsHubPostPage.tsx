import React, { useEffect, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Pencil, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { incrementPostView } from '@/hooks/useNewsHub';
import { PostContent } from '@/components/news-hub/PostContent';
import { PostInlineEditor } from '@/components/news-hub/PostInlineEditor';
import type { NewsHubPost } from '@/types/newsHub';

const NewsHubPostPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const [post, setPost] = useState<NewsHubPost | null>(null);
  const [draft, setDraft] = useState<NewsHubPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const editParam = searchParams.get('edit') === '1';
  const editing = editParam && isAdmin && !!post;

  const fetchPost = async () => {
    if (!slug) return;
    setLoading(true);
    let { data } = await (supabase.from('news_hub_posts' as any) as any)
      .select('*, category:news_hub_categories(*)')
      .eq('slug', slug)
      .maybeSingle();

    if (!data && /^[0-9a-f-]{36}$/i.test(slug)) {
      const r = await (supabase.from('news_hub_posts' as any) as any)
        .select('*, category:news_hub_categories(*)')
        .eq('id', slug)
        .maybeSingle();
      data = r.data;
    }

    if (!data) {
      setNotFound(true);
    } else {
      setPost(data as NewsHubPost);
      setDraft(data as NewsHubPost);
      document.title = `${(data as any).title} – Centrum Aktualności`;
    }
    setLoading(false);
  };

  useEffect(() => { fetchPost(); /* eslint-disable-next-line */ }, [slug]);

  useEffect(() => {
    if (post && !editing) {
      incrementPostView(post.id, user?.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post?.id]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  if (notFound || !post || !draft) {
    return <Navigate to="/aktualnosci" replace />;
  }
  if (!post.is_published && !isAdmin) {
    return <Navigate to="/aktualnosci" replace />;
  }

  // Render with draft when editing so live preview updates instantly
  const renderPost = editing ? draft : post;
  const pageStyle = renderPost.style_overrides?.page || {};
  const maxWidth = pageStyle.maxWidth ?? 896;

  return (
    <div
      className="min-h-screen text-foreground"
      style={{ background: pageStyle.background || undefined, backgroundColor: pageStyle.background ? undefined : 'hsl(var(--background))' }}
    >
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div
          className="mx-auto px-4 py-3 flex items-center justify-between gap-3"
          style={{ maxWidth, paddingRight: editing ? undefined : 16 }}
        >
          <Link to="/aktualnosci" className="inline-flex items-center gap-2 text-sm font-medium hover:text-primary">
            <ArrowLeft className="h-4 w-4" /> Centrum Aktualności
          </Link>
          {isAdmin && !editing && (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="gap-2" onClick={() => {
                searchParams.set('edit', '1');
                setSearchParams(searchParams, { replace: true });
              }}>
                <Pencil className="h-4 w-4" /> Edytuj
              </Button>
              <Link to="/admin/news-hub">
                <Button size="sm" variant="ghost" className="gap-2">
                  <Settings className="h-4 w-4" /> Zarządzaj
                </Button>
              </Link>
            </div>
          )}
        </div>
      </header>

      <main
        className="mx-auto px-4 py-8 transition-all"
        style={{ maxWidth, paddingRight: editing ? 16 : undefined }}
      >
        {!renderPost.is_published && (
          <div className="mb-4 rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
            Szkic — niewidoczny dla użytkowników.
          </div>
        )}
        <PostContent post={renderPost} styleOverrides={renderPost.style_overrides} />
      </main>

      {/* push content left so editor doesn't overlap on large screens */}
      {editing && <div aria-hidden className="hidden md:block" style={{ width: 480 }} />}

      {editing && (
        <>
          <style>{`@media (min-width: 768px) { body { padding-right: 480px; } }`}</style>
          <PostInlineEditor
            post={post}
            draft={draft}
            setDraft={setDraft as React.Dispatch<React.SetStateAction<NewsHubPost>>}
            onClose={async (saved, newSlug) => {
              searchParams.delete('edit');
              setSearchParams(searchParams, { replace: true });
              if (saved) {
                if (newSlug && newSlug !== slug) {
                  navigate(`/aktualnosci/${newSlug}`, { replace: true });
                } else {
                  await fetchPost();
                }
              } else {
                // discard: reset draft to current post
                setDraft(post);
              }
            }}
          />
        </>
      )}
    </div>
  );
};

export default NewsHubPostPage;
