import { useMemo, useState } from 'react';
import { useDebugStore, getMockedDate } from '../stores/debugStore';
import { usePomodoroStore } from '../stores/pomodoroStore';

type CellData = {
  level: number;
  date: Date;
  totalHours: number;
  breakdown: { name: string; hours: number }[];
};

export default function ContributionGrid() {
  const days = 7;
  const blocksPerDay = 30;
  const dateOffsetDays = useDebugStore((state) => state.dateOffsetDays);
  const todayTotalTime = usePomodoroStore(state => state.todayTotalTime);

  // Generate stable mock data on mount
  const grid = useMemo(() => {
    const todayDate = getMockedDate();
    const todayDOW = todayDate.getDay();

    return Array.from({ length: days }, (_, rowIndex) =>
      Array.from({ length: blocksPerDay }, (_, colIndex) => {
        const weeksAgo = (blocksPerDay - 1) - colIndex;
        const daysAgo = weeksAgo * 7 + (todayDOW - rowIndex);
        
        let level = 0;
        let totalHours = 0;
        let breakdown: { name: string; hours: number }[] = [];
        
        const date = new Date(todayDate);
        date.setDate(date.getDate() - daysAgo);

        if (daysAgo < 0) {
          // Future day
          level = 0;
        } else if (daysAgo === 0) {
          // Today
          totalHours = Math.round((todayTotalTime / 60) * 10) / 10;
          if (totalHours <= 0) level = 0;
          else if (totalHours <= 1) level = 1;
          else if (totalHours <= 3) level = 2;
          else if (totalHours <= 5) level = 3;
          else level = 4;
          
          if (totalHours > 0) {
            breakdown.push({ name: 'Session', hours: totalHours });
          }
        } else {
          // Past days mock
          const seed = date.getFullYear() * 10000 + (date.getMonth()+1) * 100 + date.getDate();
          const rand = Math.abs(Math.sin(seed));
          level = rand < 0.45 ? 0 : rand < 0.62 ? 1 : rand < 0.78 ? 2 : rand < 0.91 ? 3 : 4;
          if (level > 0) {
            totalHours = Math.floor(rand * 4) + level;
            const codeHours = Math.floor(totalHours * 0.6);
            const readHours = totalHours - codeHours;
            if (codeHours > 0) breakdown.push({ name: 'Code', hours: codeHours });
            if (readHours > 0) breakdown.push({ name: 'Read', hours: readHours });
          }
        }

        return { level, date, totalHours, breakdown };
      })
    );
  }, [dateOffsetDays, todayTotalTime]);

  const [hoveredCell, setHoveredCell] = useState<{
    data: CellData;
    rect: DOMRect;
  } | null>(null);

  const handleMouseEnter = (e: React.MouseEvent, data: CellData) => {
    if (data.level === 0) return; // Skip empty cells
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setHoveredCell({ data, rect });
  };

  const handleMouseLeave = () => {
    setHoveredCell(null);
  };

  return (
    <>
      <div className="contribution-grid" onMouseLeave={handleMouseLeave}>
        {grid.map((row, rowIndex) => (
          <div key={rowIndex} className="contribution-row">
            {row.map((cell, colIndex) => (
              <div
                key={colIndex}
                className="contribution-cell"
                style={{
                  backgroundColor: cell.level === 0 ? 'var(--grid-base)' : 'var(--grid-active)',
                  opacity: cell.level === 0 ? 1 : [0, 0.30, 0.50, 0.72, 1.0][cell.level],
                }}
                onMouseEnter={(e) => handleMouseEnter(e, cell)}
              />
            ))}
          </div>
        ))}
      </div>

      {hoveredCell && (() => {
        const tooltipWidth = 140; // Approximate width based on min-width 120 + padding
        const center = hoveredCell.rect.left + hoveredCell.rect.width / 2;
        // Clamp the left position to keep tooltip within the window's 300px width
        const left = Math.max(10, Math.min(center - tooltipWidth / 2, window.innerWidth - tooltipWidth - 10));

        return (
          <div 
            className="contribution-tooltip"
            style={{
              position: 'fixed',
              left: left,
              top: hoveredCell.rect.top - 8,
            }}
          >
          <div className="tooltip-date">
            {`${hoveredCell.data.date.getDate()}/${hoveredCell.data.date.getMonth() + 1}/${hoveredCell.data.date.getFullYear() % 100}`}
          </div>
          <div className="tooltip-total">{hoveredCell.data.totalHours}h</div>
          {hoveredCell.data.breakdown.length > 0 && (
            <div className="tooltip-breakdown">
              {hoveredCell.data.breakdown.map(b => (
                <div key={b.name} className="tooltip-b-item">
                  <span className="tooltip-b-hours">{b.hours}h</span>
                  <span className="tooltip-b-name">{b.name}</span>
                </div>
              ))}
            </div>
          )}
          </div>
        );
      })()}
    </>
  );
}
