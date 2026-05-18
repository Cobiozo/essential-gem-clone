import React, { useEffect, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Pencil, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { incrementPostView } from '@/hooks/useNewsHub';
import { PostContent } from '@/components/news-hub/PostContent';
import { PostFormDialog } from '@/components/news-hub/PostFormDialog';
import type { NewsHubPost } from '@/types/newsHub';

const NewsHubPostPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const [post, setPost] = useState<NewsHubPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const editParam = searchParams.get('edit') === '1';

  const fetchPost = async () => {
    if (!slug) return;
    setLoading(true);
    // try by slug first
    let { data } = await (supabase.from('news_hub_posts' as any) as any)
      .select('*, category:news_hub_categories(*)')
      .eq('slug', slug)
      .maybeSingle();

    // fallback: try by id (uuid)
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
      document.title = `${(data as any).title} – Centrum Aktualności`;
    }
    setLoading(false);
  };

  useEffect(() => { fetchPost(); /* eslint-disable-next-line */ }, [slug]);

  useEffect(() => {
    if (post && !editParam) {
      incrementPostView(post.id, user?.id);
    }
  }, [post?.id, editParam, user?.id]);

  useEffect(() => {
    if (editParam && isAdmin && post) setEditOpen(true);
  }, [editParam, isAdmin, post]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (notFound || !post) {
    return <Navigate to="/aktualnosci" replace />;
  }

  // hide unpublished from non-admins
  if (!post.is_published && !isAdmin) {
    return <Navigate to="/aktualnosci" replace />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="container max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link to="/aktualnosci" className="inline-flex items-center gap-2 text-sm font-medium hover:text-primary">
            <ArrowLeft className="h-4 w-4" /> Centrum Aktualności
          </Link>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="gap-2" onClick={() => setEditOpen(true)}>
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

      <main className="container max-w-4xl mx-auto px-4 py-8">
        {!post.is_published && (
          <div className="mb-4 rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
            Szkic — niewidoczny dla użytkowników.
          </div>
        )}
        <PostContent post={post} />
      </main>

      {isAdmin && (
        <PostFormDialog
          open={editOpen}
          post={post}
          onClose={() => {
            setEditOpen(false);
            if (editParam) {
              searchParams.delete('edit');
              setSearchParams(searchParams, { replace: true });
            }
          }}
          onSaved={async () => {
            setEditOpen(false);
            if (editParam) {
              searchParams.delete('edit');
              setSearchParams(searchParams, { replace: true });
            }
            // refetch (slug may have changed)
            const { data } = await (supabase.from('news_hub_posts' as any) as any)
              .select('slug')
              .eq('id', post.id)
              .maybeSingle();
            const newSlug = (data as any)?.slug;
            if (newSlug && newSlug !== slug) {
              navigate(`/aktualnosci/${newSlug}`, { replace: true });
            } else {
              fetchPost();
            }
          }}
        />
      )}
    </div>
  );
};

export default NewsHubPostPage;
