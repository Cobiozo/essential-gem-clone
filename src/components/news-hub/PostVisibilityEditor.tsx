import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Globe, Lock } from 'lucide-react';
import type { NewsHubPost, NewsHubVisibilityMode } from '@/types/newsHub';
import { UserAccessPicker } from './UserAccessPicker';

interface Props {
  draft: Pick<NewsHubPost, 'id' | 'visibility_mode' | 'visible_to_admin' | 'visible_to_partner' | 'visible_to_client' | 'visible_to_specjalista'>;
  update: (patch: Partial<NewsHubPost>) => void;
  /** When undefined, per-user picker is hidden (post not yet saved) */
  postId?: string;
}

const ROLES: Array<{ key: 'visible_to_admin' | 'visible_to_partner' | 'visible_to_client' | 'visible_to_specjalista'; label: string }> = [
  { key: 'visible_to_admin', label: 'Admin' },
  { key: 'visible_to_partner', label: 'Partner' },
  { key: 'visible_to_client', label: 'Klient' },
  { key: 'visible_to_specjalista', label: 'Specjalista' },
];

export const PostVisibilityEditor: React.FC<Props> = ({ draft, update, postId }) => {
  const mode: NewsHubVisibilityMode = (draft.visibility_mode as NewsHubVisibilityMode) || 'public';
  const restricted = mode === 'restricted';

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs">Tryb widoczności</Label>
        <RadioGroup
          value={mode}
          onValueChange={(v) => update({ visibility_mode: v as NewsHubVisibilityMode })}
          className="mt-1.5 grid grid-cols-1 gap-2"
        >
          <label className="flex items-start gap-3 rounded-md border border-border p-3 cursor-pointer hover:bg-muted/50">
            <RadioGroupItem value="public" className="mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-semibold flex items-center gap-1.5"><Globe className="h-4 w-4" /> Publiczny</div>
              <div className="text-xs text-muted-foreground">Widoczny dla wszystkich, którzy mają dostęp do modułu Aktualności.</div>
            </div>
          </label>
          <label className="flex items-start gap-3 rounded-md border border-border p-3 cursor-pointer hover:bg-muted/50">
            <RadioGroupItem value="restricted" className="mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-semibold flex items-center gap-1.5"><Lock className="h-4 w-4" /> Ograniczony</div>
              <div className="text-xs text-muted-foreground">Widoczny tylko dla wybranych ról i/lub konkretnych użytkowników.</div>
            </div>
          </label>
        </RadioGroup>
      </div>

      {restricted && (
        <>
          <div>
            <Label className="text-xs">Widoczne dla ról</Label>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {ROLES.map((r) => (
                <label key={r.key} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                  <span>{r.label}</span>
                  <Switch
                    checked={(draft as any)[r.key] !== false}
                    onCheckedChange={(v) => update({ [r.key]: v } as any)}
                  />
                </label>
              ))}
            </div>
          </div>

          {postId ? (
            <UserAccessPicker
              table="news_hub_post_user_access"
              filter={{ post_id: postId }}
              extraInsert={{ post_id: postId }}
              label="Indywidualny dostęp"
              description="Konkretni użytkownicy, którzy widzą ten post niezależnie od ustawień ról."
            />
          ) : (
            <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
              Zapisz post, aby dodać konkretnych użytkowników z dostępem.
            </div>
          )}
        </>
      )}
    </div>
  );
};
