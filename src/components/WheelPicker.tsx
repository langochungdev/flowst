import { useRef, useEffect, useState } from 'react';

interface WheelPickerProps {
  value: number; 
  onChange: (value: number) => void;
  onClose: () => void;
}

const options = [
  ...Array.from({ length: 12 }, (_, i) => (i + 1) * 5 * 60), // 5m to 60m
  90 * 60, 120 * 60, 150 * 60, 180 * 60, 210 * 60, 240 * 60, 270 * 60, 300 * 60 // 1h30 to 5h
];

function formatEditTime(seconds: number) {
  const totalMinutes = Math.floor(seconds / 60);
  if (totalMinutes < 60) {
    return `${totalMinutes}m`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h${mins}m`;
}

export default function WheelPicker({ value, onChange, onClose }: WheelPickerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const itemHeight = 36; 
  const [activeIndex, setActiveIndex] = useState(() => options.indexOf(value));

  useEffect(() => {
    if (scrollRef.current) {
      const index = options.indexOf(value);
      if (index !== -1) {
        scrollRef.current.scrollTop = index * itemHeight;
      }
    }
  }, []);

  const isDragging = useRef(false);
  const hasMoved = useRef(false);
  const startY = useRef(0);
  const startScrollTop = useRef(0);
  const clickTimeoutRef = useRef<any>(null);
  
  const lastY = useRef(0);
  const lastTime = useRef(0);
  const velocity = useRef(0);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const clickedOptRef = useRef<number | null>(null);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    isDragging.current = true;
    hasMoved.current = false;
    startY.current = e.clientY;
    lastY.current = e.clientY;
    lastTime.current = performance.now();
    startScrollTop.current = scrollRef.current!.scrollTop;
    
    const item = (e.target as HTMLElement).closest('.wheel-item');
    if (item) {
      clickedOptRef.current = Number(item.getAttribute('data-value'));
    } else {
      clickedOptRef.current = null;
    }

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    const dy = e.clientY - startY.current;
    if (Math.abs(dy) > 5) {
      hasMoved.current = true;
    }
    
    const now = performance.now();
    const dt = now - lastTime.current;
    if (dt > 0) {
      velocity.current = (e.clientY - lastY.current) / dt;
    }
    lastY.current = e.clientY;
    lastTime.current = now;

    scrollRef.current!.scrollTop = startScrollTop.current - dy;
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (err) {}

    // Handle click if we didn't move
    if (!hasMoved.current && clickedOptRef.current !== null) {
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
      const opt = clickedOptRef.current;
      clickTimeoutRef.current = setTimeout(() => {
        if (!isDragging.current) {
          onChange(opt);
          onClose();
        }
      }, 250);
      return; // We don't apply momentum if it was a click
    }

    const now = performance.now();
    if (now - lastTime.current > 50) {
      velocity.current = 0;
    }

    if (hasMoved.current && Math.abs(velocity.current) > 0.1) {
      let v = velocity.current;
      let lastFrameTime = performance.now();
      
      if (scrollRef.current) {
        scrollRef.current.style.scrollSnapType = 'none';
      }

      const step = (time: number) => {
        if (!scrollRef.current) return;
        const dt = time - lastFrameTime;
        lastFrameTime = time;
        
        scrollRef.current.scrollTop -= v * dt;
        v *= Math.pow(0.995, dt);

        if (Math.abs(v) < 0.05) {
          scrollRef.current.style.scrollSnapType = 'y mandatory';
          scrollRef.current.scrollTop += 1;
          scrollRef.current.scrollTop -= 1;
          return;
        }
        animationRef.current = requestAnimationFrame(step);
      };
      animationRef.current = requestAnimationFrame(step);
    }
  };

  useEffect(() => {
    const handleDocumentClick = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.wheel-container') && !target.closest('.time-text')) {
        onClose();
      }
    };
    document.addEventListener('pointerdown', handleDocumentClick);
    return () => document.removeEventListener('pointerdown', handleDocumentClick);
  }, [onClose]);

  return (
    <div className="wheel-container">
      <div className="wheel-highlight" />
      <div 
        className="wheel-list" 
        ref={scrollRef} 
        onScroll={() => {
          if (scrollRef.current) {
            const index = Math.round(scrollRef.current.scrollTop / itemHeight);
            setActiveIndex(index);
          }
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ userSelect: 'none', touchAction: 'none' }}
      >
        <div style={{ height: itemHeight }} />
        {options.map((opt, i) => (
          <div 
            key={opt} 
            className={`wheel-item ${i === activeIndex ? 'active' : ''}`} 
            style={{ height: itemHeight }}
            data-value={opt}
          >
            {formatEditTime(opt)}
          </div>
        ))}
        <div style={{ height: itemHeight }} />
      </div>
    </div>
  );
}
