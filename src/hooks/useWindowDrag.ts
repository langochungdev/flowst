import React, { useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

export function useWindowDrag() {
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const dragOccurred = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });

  const startDrag = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    // Do not drag if clicking on inputs or wheel container
    if (
      target.closest("input") ||
      target.closest("select") ||
      target.closest(".wheel-container") ||
      target.closest(".wheel-list") ||
      target.closest(".no-drag")
    ) {
      return;
    }
    isDraggingRef.current = true;
    dragOccurred.current = false;
    startPos.current = { x: e.clientX, y: e.clientY };
    setIsDragging(true); // immediate feedback
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;
    // Start dragging if moved more than 4 pixels
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      isDraggingRef.current = false;
      dragOccurred.current = true;
      getCurrentWindow()
        .startDragging()
        .then(() => setIsDragging(false))
        .catch(() => setIsDragging(false));
    }
  };

  const onPointerUp = () => {
    if (isDraggingRef.current) {
      // It was just a click, do not drag
      isDraggingRef.current = false;
    }
    setIsDragging(false);
  };

  const onClickCapture = (e: React.MouseEvent) => {
    if (dragOccurred.current) {
      e.stopPropagation();
      e.preventDefault();
      dragOccurred.current = false;
    }
  };

  return {
    isDragging,
    startDrag,
    bind: {
      onPointerDown: startDrag,
      onPointerMove,
      onPointerUp,
      onClickCapture,
    },
  };
}
