import React, { createContext, useContext } from 'react';
import { cn } from '@/lib/utils';
import type { ElementStyle, EditElementType } from '@/types/homepageV2';

interface EditCtx {
  editable: boolean;
  styles: Record<string, ElementStyle>;
  selectedPath: string | null;
  hoveredPath: string | null;
  onSelect: (path: string, type: EditElementType) => void;
  onHover: (path: string | null) => void;
  /** Optional style patcher — enables drag/resize overlays to write back. */
  onUpdateStyle?: (path: string, patch: Partial<ElementStyle>) => void;
}

const Ctx = createContext<EditCtx>({
  editable: false,
  styles: {},
  selectedPath: null,
  hoveredPath: null,
  onSelect: () => {},
  onHover: () => {},
});

export const EditProvider = Ctx.Provider;
export const useEdit = () => useContext(Ctx);

/** CSS keys reserved for layout — applied as transform / size, not as raw style. */
const LAYOUT_KEYS = new Set(['offsetX', 'offsetY', 'scale', 'width', 'height', 'zIndex']);

/** Build the inline style from an override, splitting layout vs visual. */
function buildStyleFromOverride(override: ElementStyle | undefined): React.CSSProperties {
  if (!override) return {};
  const out: React.CSSProperties = {};
  for (const [k, v] of Object.entries(override)) {
    if (v == null || v === '') continue;
    if (LAYOUT_KEYS.has(k)) continue;
    (out as any)[k] = v;
  }
  const hasOffset = override.offsetX != null || override.offsetY != null;
  const hasScale = override.scale != null && override.scale !== 1;
  if (hasOffset || hasScale) {
    const tx = override.offsetX || 0;
    const ty = override.offsetY || 0;
    const sc = override.scale ?? 1;
    out.transform = `translate(${tx}px, ${ty}px) scale(${sc})`;
    out.transformOrigin = 'top left';
    out.willChange = 'transform';
  }
  if (override.width) out.width = override.width;
  if (override.height) out.height = override.height;
  if (override.zIndex != null) {
    out.zIndex = override.zIndex;
    out.position = out.position || 'relative';
  }
  return out;
}

/**
 * Wraps a single child element to make it editable when in edit mode.
 * Always merges style overrides from ctx.styles[path] into the child's style.
 */
export function E({
  path,
  type,
  children,
}: {
  path: string;
  type: EditElementType;
  children: React.ReactElement;
}) {
  const ctx = useEdit();
  const child = React.Children.only(children);
  const override = ctx.styles[path];
  const overrideStyle = buildStyleFromOverride(override);
  const mergedStyle = { ...(child.props.style || {}), ...overrideStyle };

  if (!ctx.editable) {
    return React.cloneElement(child, { style: mergedStyle });
  }

  const selected = ctx.selectedPath === path;
  const hovered = ctx.hoveredPath === path && !selected;

  const prevOnClick = child.props.onClick;
  const prevMouseEnter = child.props.onMouseEnter;
  const prevMouseLeave = child.props.onMouseLeave;

  return React.cloneElement(child, {
    style: mergedStyle,
    'data-edit-path': path,
    'data-edit-type': type,
    onClick: (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      ctx.onSelect(path, type);
      prevOnClick?.(e);
    },
    onMouseEnter: (e: React.MouseEvent) => {
      e.stopPropagation();
      ctx.onHover(path);
      prevMouseEnter?.(e);
    },
    onMouseLeave: (e: React.MouseEvent) => {
      ctx.onHover(null);
      prevMouseLeave?.(e);
    },
    className: cn(
      child.props.className,
      'relative cursor-pointer',
      hovered && 'outline outline-2 outline-blue-300 outline-offset-2 rounded-sm',
      selected && 'outline outline-2 outline-blue-500 outline-offset-2 rounded-sm',
    ),
  });
}
