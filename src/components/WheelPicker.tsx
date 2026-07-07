import { useRef, useEffect } from 'react';

interface WheelPickerProps {
  value: number; 
  onChange: (value: number) => void;
  onClose: () => void;
}

export default function WheelPicker({ value, onChange, onClose }: WheelPickerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const itemHeight = 50; 
  const options = Array.from({ length: 24 }, (_, i) => (i + 1) * 5 * 60);

  useEffect(() => {
    if (scrollRef.current) {
      const index = options.indexOf(value);
      if (index !== -1) {
        scrollRef.current.scrollTop = index * itemHeight;
      }
    }
  }, []);

  const timerRef = useRef<any>(null);
  const handleScroll = () => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (scrollRef.current) {
        const index = Math.round(scrollRef.current.scrollTop / itemHeight);
        const clamped = Math.max(0, Math.min(index, options.length - 1));
        onChange(options[clamped]);
      }
    }, 150);
  };

  const isDragging = useRef(false);
  const startY = useRef(0);
  const startScrollTop = useRef(0);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = true;
    startY.current = e.clientY;
    startScrollTop.current = scrollRef.current!.scrollTop;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    const dy = e.clientY - startY.current;
    scrollRef.current!.scrollTop = startScrollTop.current - dy;
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  return (
    <div className="wheel-container" onMouseLeave={onClose}>
      <div className="wheel-highlight" />
      <div 
        className="wheel-list" 
        ref={scrollRef} 
        onScroll={handleScroll}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div style={{ height: itemHeight }} />
        {options.map(opt => (
          <div 
            key={opt} 
            className="wheel-item" 
            style={{ height: itemHeight }}
            onClick={() => {
              if (Math.abs(scrollRef.current!.scrollTop - startScrollTop.current) < 5) {
                onChange(opt);
                onClose();
              }
            }}
          >
            {Math.floor(opt / 60).toString().padStart(2, '0')}:00
          </div>
        ))}
        <div style={{ height: itemHeight }} />
      </div>
    </div>
  );
}
