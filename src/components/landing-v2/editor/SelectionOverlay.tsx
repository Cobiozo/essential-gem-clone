import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useEdit } from './EditContext';
import type { ElementStyle } from '@/types/homepageV2';

/**
 * Floating overlay over the currently-selected editable element.
 * Provides a drag handle (move) and 8 resize handles.
 * Writes back via ctx.onUpdateStyle({ offsetX, offsetY, width, height }).
 */
type DragMode = null | 'move' | 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

interface Rect { left: number; top: number; width: number; height: number; }

export const SelectionOverlay: React.FC = () => {
  const ctx = useEdit();
  const [rect, setRect] = useState<Rect | null>(null);
  const [tick, setTick] = useState(0);
  const modeRef = useRef<DragMode>(null);
  const startRef = useRef<{
    x: number; y: number;
    baseOffsetX: number; baseOffsetY: number;
    baseWidth: number; baseHeight: number;
  } | null>(null);

  const selectedPath = ctx.selectedPath;
  const canEdit = ctx.editable && !!ctx.onUpdateStyle && !!selectedPath;

  const measure = useCallback(() => {
    if (!selectedPath) { setRect(null); return; }
    const el = document.querySelector<HTMLElement>(`[data-edit-path="${CSS.escape(selectedPath)}"]`);
    if (!el) { setRect(null); return; }
    const r = el.getBoundingClientRect();
    setRect({ left: r.left, top: r.top, width: r.width, height: r.height });
  }, [selectedPath]);

  useEffect(() => {
    if (!canEdit) { setRect(null); return; }
    measure();
    const onWin = () => measure();
    window.addEventListener('resize', onWin);
    window.addEventListener('scroll', onWin, true);
    const id = window.setInterval(measure, 250);
    return () => {
      window.removeEventListener('resize', onWin);
      window.removeEventListener('scroll', onWin, true);
      window.clearInterval(id);
    };
  }, [canEdit, measure, tick]);

  if (!canEdit || !rect || !selectedPath) return null;

  const cur: ElementStyle = ctx.styles[selectedPath] || {};

  const onPointerDown = (mode: DragMode) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const el = document.querySelector<HTMLElement>(`[data-edit-path="${CSS.escape(selectedPath)}"]`);
    if (!el) return;
    const r = el.getBoundingClientRect();
    modeRef.current = mode;
    startRef.current = {
      x: e.clientX,
      y: e.clientY,
      baseOffsetX: cur.offsetX || 0,
      baseOffsetY: cur.offsetY || 0,
      baseWidth: r.width,
      baseHeight: r.height,
    };
    (e.target as Element).setPointerCapture?.(e.pointerId);

    const onMove = (ev: PointerEvent) => {
      const st = startRef.current;
      if (!st || !modeRef.current) return;
      const dx = ev.clientX - st.x;
      const dy = ev.clientY - st.y;
      const patch: Partial<ElementStyle> = {};
      const m = modeRef.current;
      if (m === 'move') {
        patch.offsetX = st.baseOffsetX + dx;
        patch.offsetY = st.baseOffsetY + dy;
      } else {
        let w = st.baseWidth;
        let h = st.baseHeight;
        let ox = st.baseOffsetX;
        let oy = st.baseOffsetY;
        if (m.includes('e')) w = Math.max(20, st.baseWidth + dx);
        if (m.includes('s')) h = Math.max(20, st.baseHeight + dy);
        if (m.includes('w')) { w = Math.max(20, st.baseWidth - dx); ox = st.baseOffsetX + dx; }
        if (m.includes('n')) { h = Math.max(20, st.baseHeight - dy); oy = st.baseOffsetY + dy; }
        if (ev.shiftKey && (m === 'se' || m === 'sw' || m === 'ne' || m === 'nw')) {
          const ratio = st.baseWidth / Math.max(1, st.baseHeight);
          if (Math.abs(dx) > Math.abs(dy)) h = Math.max(20, w / ratio);
          else w = Math.max(20, h * ratio);
        }
        patch.width = `${Math.round(w)}px`;
        patch.height = `${Math.round(h)}px`;
        if (m.includes('w')) patch.offsetX = ox;
        if (m.includes('n')) patch.offsetY = oy;
      }
      ctx.onUpdateStyle?.(selectedPath, patch);
      setTick((t) => t + 1);
    };
    const onUp = () => {
      modeRef.current = null;
      startRef.current = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const handle = (cursor: string, style: React.CSSProperties, mode: DragMode) => (
    <div
      onPointerDown={onPointerDown(mode)}
      style={{
        position: 'absolute',
        width: 12, height: 12,
        background: '#3b82f6',
        border: '2px solid white',
        borderRadius: 3,
        cursor,
        boxShadow: '0 1px 3px rgba(0,0,0,.25)',
        touchAction: 'none',
        ...style,
      }}
    />
  );

  return (
    <div
      style={{
        position: 'fixed',
        left: rect.left - 2,
        top: rect.top - 2,
        width: rect.width + 4,
        height: rect.height + 4,
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    >
      {/* Move handle — full area, drag anywhere in center */}
      <div
        onPointerDown={onPointerDown('move')}
        title="Przeciągnij, aby przesunąć"
        style={{
          position: 'absolute',
          inset: 6,
          cursor: 'move',
          pointerEvents: 'auto',
          background: 'transparent',
          touchAction: 'none',
        }}
      />
      {/* Header pill */}
      <div style={{
        position: 'absolute',
        top: -22, left: 0,
        background: '#3b82f6',
        color: 'white',
        fontSize: 10,
        padding: '2px 6px',
        borderRadius: 3,
        pointerEvents: 'none',
        fontFamily: 'ui-sans-serif, system-ui',
        whiteSpace: 'nowrap',
      }}>⇄ przeciągnij / narożniki = rozmiar</div>
      {/* Resize handles */}
      <div style={{ pointerEvents: 'auto' }}>
        {handle('nwse-resize', { left: -6, top: -6 }, 'nw')}
        {handle('ns-resize',   { left: '50%', top: -6, transform: 'translateX(-50%)' }, 'n')}
        {handle('nesw-resize', { right: -6, top: -6 }, 'ne')}
        {handle('ew-resize',   { right: -6, top: '50%', transform: 'translateY(-50%)' }, 'e')}
        {handle('nwse-resize', { right: -6, bottom: -6 }, 'se')}
        {handle('ns-resize',   { left: '50%', bottom: -6, transform: 'translateX(-50%)' }, 's')}
        {handle('nesw-resize', { left: -6, bottom: -6 }, 'sw')}
        {handle('ew-resize',   { left: -6, top: '50%', transform: 'translateY(-50%)' }, 'w')}
      </div>
    </div>
  );
};
