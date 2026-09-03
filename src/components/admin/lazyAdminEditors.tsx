import React, { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Etap 2 — drugi poziom lazy loadingu.
 *
 * AdminShell (Admin.tsx) importował statycznie ciężkie edytory (RichTextEditor,
 * LivePreviewEditor, SectionEditor, TextEditor, MediaUpload...). Przez to cały
 * stack edytorów trafiał do chunku shella i był pobierany zanim administrator
 * w ogóle otworzył jakikolwiek edytor.
 *
 * Tutaj każdy edytor jest ładowany dopiero przy pierwszym renderze i opakowany
 * we własny Suspense, więc jest to zamiennik 1:1 dla dotychczasowych importów.
 */

const EditorFallback: React.FC = () => (
  <div className="flex items-center justify-center py-8 text-muted-foreground">
    <Loader2 className="h-5 w-5 animate-spin mr-2" />
    <span className="text-sm">Ładowanie edytora…</span>
  </div>
);

function withSuspense<P extends object>(Comp: React.ComponentType<P>): React.FC<P> {
  const Wrapped: React.FC<P> = (props) => (
    <Suspense fallback={<EditorFallback />}>
      <Comp {...(props as P)} />
    </Suspense>
  );
  return Wrapped;
}

export const RichTextEditor = withSuspense(
  lazy(async () => ({ default: (await import('@/components/RichTextEditor')).RichTextEditor })),
) as React.FC<React.ComponentProps<typeof import('@/components/RichTextEditor').RichTextEditor>>;

export const TextEditor = withSuspense(
  lazy(async () => ({ default: (await import('@/components/cms/TextEditor')).TextEditor })),
) as React.FC<React.ComponentProps<typeof import('@/components/cms/TextEditor').TextEditor>>;

export const ColorSchemeEditor = withSuspense(
  lazy(async () => ({ default: (await import('@/components/cms/ColorSchemeEditor')).ColorSchemeEditor })),
) as React.FC<React.ComponentProps<typeof import('@/components/cms/ColorSchemeEditor').ColorSchemeEditor>>;

export const SectionEditor = withSuspense(
  lazy(async () => ({ default: (await import('@/components/cms/SectionEditor')).SectionEditor })),
) as React.FC<React.ComponentProps<typeof import('@/components/cms/SectionEditor').SectionEditor>>;

export const LivePreviewEditor = withSuspense(
  lazy(async () => ({ default: (await import('@/components/dnd/LivePreviewEditor')).LivePreviewEditor })),
) as React.FC<React.ComponentProps<typeof import('@/components/dnd/LivePreviewEditor').LivePreviewEditor>>;

export const MediaUpload = withSuspense(
  lazy(async () => ({ default: (await import('@/components/MediaUpload')).MediaUpload })),
) as React.FC<React.ComponentProps<typeof import('@/components/MediaUpload').MediaUpload>>;

export const GroupEmailSender = withSuspense(
  lazy(async () => ({ default: (await import('@/components/GroupEmailSender')).GroupEmailSender })),
) as React.FC<React.ComponentProps<typeof import('@/components/GroupEmailSender').GroupEmailSender>>;
