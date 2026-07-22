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
  const mergedStyle = { ...(child.props.style || {}), ...(override || {}) };

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
