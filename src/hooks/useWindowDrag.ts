import React from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';

export function useWindowDrag() {
  const startDrag = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('input') ||
      target.closest('select') ||
      target.closest('.custom-select') ||
      target.closest('.time-text') ||
      target.closest('.wheel-container') ||
      target.closest('.settings-pane') ||
      target.closest('.action-buttons')
    ) {
      return;
    }
    getCurrentWindow().startDragging().catch(() => {});
  };

  return { startDrag };
}
