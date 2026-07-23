import React from 'react';
import * as LucideIcons from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Widget } from '@/types/homepageV2';
import { E } from '../editor/EditContext';
import { videoMime } from '@/lib/videoMime';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface Props {
  widgets: Widget[];
  basePath?: string;
}

function LucideIcon({ name, className }: { name: string; className?: string }) {
  const Comp = (LucideIcons as any)[name] || LucideIcons.Sparkles;
  return <Comp className={className} strokeWidth={1.5} />;
}

function CtaLink({ url, children, className, style }: { url: string; children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  if (!url) return <span className={className} style={style}>{children}</span>;
  if (/^https?:\/\//i.test(url)) return <a href={url} target="_blank" rel="noreferrer" className={className} style={style}>{children}</a>;
  if (url.startsWith('#')) return <a href={url} className={className} style={style}>{children}</a>;
  return <Link to={url} className={className} style={style}>{children}</Link>;
}

function ytEmbed(url: string): string | null {
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?rel=0&modestbranding=1`;
  const vim = url.match(/vimeo\.com\/(\d+)/);
  if (vim) return `https://player.vimeo.com/video/${vim[1]}`;
  return null;
}

function renderWidget(w: Widget, path: string): React.ReactNode {
  const p = w.props || {};
  switch (w.kind) {
    case 'heading': {
      const Tag = (p.level && ['h1','h2','h3','h4'].includes(p.level)) ? p.level : 'h2';
      return (
        <E path={path} type="heading">
          <Tag className="font-bold tracking-tight text-2xl md:text-3xl lg:text-4xl">
            {p.text || 'Nagłówek'}
          </Tag>
        </E>
      );
    }
    case 'text':
      return (
        <E path={path} type="text">
          <p className="text-base leading-relaxed text-neutral-700">{p.text || 'Kliknij, aby edytować tekst.'}</p>
        </E>
      );
    case 'image':
      return (
        <E path={path} type="image">
          <img src={p.url || ''} alt={p.alt || ''} className="w-full h-auto rounded-lg" />
        </E>
      );
    case 'video': {
      const url = p.url || '';
      const isFile = /\.(mp4|webm|mov|m4v|ogv)(\?.*)?$/i.test(url);
      const embed = ytEmbed(url);
      if (isFile) {
        return (
          <E path={path} type="video">
            <video controls playsInline preload="metadata" className="w-full rounded-xl bg-black aspect-video">
              <source src={url} type={videoMime(url)} />
            </video>
          </E>
        );
      }
      if (embed) {
        return (
          <E path={path} type="video">
            <iframe src={embed} title="Wideo" allowFullScreen className="w-full aspect-video rounded-xl" style={{ border: 0 }} />
          </E>
        );
      }
      return (
        <E path={path} type="video">
          <div className="w-full aspect-video rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-400 text-sm">Dodaj URL wideo</div>
        </E>
      );
    }
    case 'button':
      return (
        <E path={path} type="button">
          <CtaLink url={p.url || '#'} className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground font-semibold px-6 py-3 hover:opacity-90 transition">
            {p.text || 'Przycisk'}
          </CtaLink>
        </E>
      );
    case 'icon':
      return (
        <E path={path} type="icon">
          <span className="inline-flex"><LucideIcon name={p.name || 'Sparkles'} className="w-10 h-10 text-primary" /></span>
        </E>
      );
    case 'card':
      return (
        <E path={path} type="card">
          <div className="rounded-2xl p-6 bg-neutral-50 text-center">
            <LucideIcon name={p.icon || 'Sparkles'} className="w-10 h-10 mx-auto mb-3 text-primary" />
            <h3 className="font-bold mb-2">{p.title || 'Tytuł karty'}</h3>
            <p className="text-sm text-neutral-600">{p.description || 'Opis karty.'}</p>
          </div>
        </E>
      );
    case 'stat':
      return (
        <E path={path} type="stat">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">{p.value || '100+'}</div>
            <div className="text-sm text-neutral-600 mt-1">{p.label || 'Opis'}</div>
          </div>
        </E>
      );
    case 'bullet-list': {
      const items: string[] = Array.isArray(p.items) ? p.items : ['Punkt 1', 'Punkt 2'];
      return (
        <E path={path} type="section">
          <ul className="space-y-2">
            {items.map((t, i) => (
              <li key={i} className="flex items-start gap-2 text-neutral-800">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </E>
      );
    }
    case 'logo-row': {
      const logos: Array<{ url: string; alt?: string }> = Array.isArray(p.logos) ? p.logos : [];
      return (
        <E path={path} type="section">
          <div className="flex flex-wrap items-center justify-center gap-8">
            {logos.length === 0 ? (
              <div className="text-neutral-400 text-sm">Brak logotypów — dodaj w edytorze.</div>
            ) : logos.map((l, i) => (
              <img key={i} src={l.url} alt={l.alt || ''} className="h-10 w-auto opacity-70 hover:opacity-100 transition" />
            ))}
          </div>
        </E>
      );
    }
    case 'divider':
      return (
        <E path={path} type="section">
          <hr className="border-t border-neutral-200 my-4" />
        </E>
      );
    case 'spacer':
      return (
        <E path={path} type="section">
          <div style={{ height: p.height || 48 }} />
        </E>
      );
    case 'container':
      return (
        <E path={path} type="section">
          <div className="rounded-2xl p-6 bg-neutral-50">
            {(w.children || []).length === 0 ? (
              <div className="text-neutral-400 text-sm text-center">Pusty kontener — dodaj widżety w edytorze.</div>
            ) : (
              <div className="space-y-4">
                {(w.children || []).map((c, i) => (
                  <React.Fragment key={c.id}>{renderWidget(c, `${path}.children.${i}`)}</React.Fragment>
                ))}
              </div>
            )}
          </div>
        </E>
      );
    case 'grid': {
      const cols = Math.max(1, Math.min(6, Number(p.cols) || 3));
      const gridClass = ['grid-cols-1','grid-cols-2','grid-cols-3','grid-cols-4','grid-cols-5','grid-cols-6'][cols - 1];
      return (
        <E path={path} type="section">
          <div className={`grid gap-4 md:${gridClass}`}>
            {(w.children || []).length === 0 ? (
              <div className="text-neutral-400 text-sm text-center col-span-full py-6">Pusta siatka — dodaj widżety w edytorze.</div>
            ) : (w.children || []).map((c, i) => (
              <React.Fragment key={c.id}>{renderWidget(c, `${path}.children.${i}`)}</React.Fragment>
            ))}
          </div>
        </E>
      );
    }
    case 'section':
      return (
        <E path={path} type="section">
          <section className="py-12">
            <div className="container mx-auto px-4">
              {p.title && <h2 className="text-3xl font-bold mb-6 text-center">{p.title}</h2>}
              <div className="space-y-4">
                {(w.children || []).map((c, i) => (
                  <React.Fragment key={c.id}>{renderWidget(c, `${path}.children.${i}`)}</React.Fragment>
                ))}
              </div>
            </div>
          </section>
        </E>
      );
    case 'collapsible': {
      const items: Array<{ title: string; body: string }> = Array.isArray(p.items) ? p.items : [{ title: 'Tytuł', body: 'Treść.' }];
      return (
        <E path={path} type="section">
          <Accordion type="single" collapsible className="w-full">
            {items.map((it, i) => (
              <AccordionItem key={i} value={`i${i}`}>
                <AccordionTrigger>{it.title}</AccordionTrigger>
                <AccordionContent>{it.body}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </E>
      );
    }
    default:
      return null;
  }
}

export const WidgetRenderer: React.FC<Props> = ({ widgets, basePath = 'widgets' }) => {
  if (!widgets?.length) return null;
  return (
    <section className="container mx-auto px-4 sm:px-6 lg:px-10 py-8 space-y-6">
      {widgets.map((w, i) => (
        <React.Fragment key={w.id}>
          {renderWidget(w, `${basePath}.${i}`)}
        </React.Fragment>
      ))}
    </section>
  );
};
