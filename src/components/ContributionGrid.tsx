import { useMemo, useState } from 'react';
import { useDebugStore, getMockedDate } from '../stores/debugStore';

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

  // Generate stable mock data on mount
  const grid = useMemo(() => {
    const today = getMockedDate();
    return Array.from({ length: days }, (_, rowIndex) =>
      Array.from({ length: blocksPerDay }, (_, colIndex) => {
        const rand = Math.random();
        const level = rand < 0.45 ? 0 : rand < 0.62 ? 1 : rand < 0.78 ? 2 : rand < 0.91 ? 3 : 4;
        
        // Fake date calculation (just going backwards)
        const date = new Date(today);
        const daysAgo = (days - rowIndex - 1) * blocksPerDay + (blocksPerDay - colIndex - 1);
        date.setDate(date.getDate() - daysAgo);

        let totalHours = 0;
        let breakdown: { name: string; hours: number }[] = [];

        if (level > 0) {
          totalHours = Math.floor(Math.random() * 4) + level; // 1 to 8 hours
          const codeHours = Math.floor(totalHours * 0.6);
          const readHours = totalHours - codeHours;
          if (codeHours > 0) breakdown.push({ name: 'Code', hours: codeHours });
          if (readHours > 0) breakdown.push({ name: 'Read', hours: readHours });
        }

        return { level, date, totalHours, breakdown };
      })
    );
  }, [dateOffsetDays]);

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
