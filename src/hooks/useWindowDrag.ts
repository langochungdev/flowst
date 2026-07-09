import React, { useRef } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';

export function useWindowDrag() {
  const isDraggingRef = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });

  const startDrag = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    // Do not drag if clicking on inputs so text can be selected
    if (target.closest('input')) {
      return;
    }
    isDraggingRef.current = true;
    startPos.current = { x: e.clientX, y: e.clientY };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;
    // Start dragging if moved more than 4 pixels
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      isDraggingRef.current = false;
      getCurrentWindow().startDragging().catch(() => {});
    }
  };

  const onPointerUp = () => {
    if (isDraggingRef.current) {
      // It was just a click, do not drag
      isDraggingRef.current = false;
    }
  };

  return { 
    startDrag,
    bind: {
      onPointerDown: startDrag,
      onPointerMove,
      onPointerUp,
    }
  };
}
