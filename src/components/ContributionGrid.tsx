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
    const todayCategoryBreakdown = usePomodoroStore(state => state.todayCategoryBreakdown);
    const history = usePomodoroStore(state => state.history);
    const categories = usePomodoroStore(state => state.categories);

    // Generate stable mock data on mount
    const grid = useMemo(() => {
        const todayDate = getMockedDate(); // we still use this if dateOffsetDays is used for testing, but let's base it on currentDateStr?
        // Actually, getMockedDate applies offset to the real Date.
        // But store's currentDate is just a string. Let's use getMockedDate so we can test the grid offset.
        const todayDOW = todayDate.getDay();
        const currentDOW = todayDOW === 0 ? 6 : todayDOW - 1; // 0=Mon, 6=Sun

        return Array.from({ length: days }, (_, rowIndex) =>
            Array.from({ length: blocksPerDay }, (_, colIndex) => {
                const weeksAgo = (blocksPerDay - 1) - colIndex;
                const daysAgo = weeksAgo * 7 + (currentDOW - rowIndex);

                let level = 0;
                let totalHours = 0;
                let breakdown: { name: string; hours: number }[] = [];

                const date = new Date(todayDate);
                date.setDate(date.getDate() - daysAgo);

                if (daysAgo < 0) {
                    // Future day
                    level = -1;
                } else if (daysAgo === 0) {
                    // Today
                    totalHours = Math.round((todayTotalTime / 60) * 10) / 10;
                    if (totalHours <= 0) level = 0;
                    else if (totalHours <= 1) level = 1;
                    else if (totalHours <= 3) level = 2;
                    else if (totalHours <= 5) level = 3;
                    else level = 4;

                    for (const [catId, mins] of Object.entries(todayCategoryBreakdown || {})) {
                        const cat = categories.find(c => c.id === catId);
                        if (cat && mins > 0) {
                            breakdown.push({ name: cat.name, hours: Math.round((mins / 60) * 10) / 10 });
                        }
                    }
                } else {
                    // Past days real history
                    const dateString = date.toISOString().split('T')[0];
                    const historicalData = (history || {})[dateString];
                    if (historicalData && historicalData.totalHours > 0) {
                        totalHours = Math.round(historicalData.totalHours * 10) / 10;
                        if (totalHours <= 0) level = 0;
                        else if (totalHours <= 1) level = 1;
                        else if (totalHours <= 3) level = 2;
                        else if (totalHours <= 5) level = 3;
                        else level = 4;

                        for (const [catId, hours] of Object.entries(historicalData.breakdown || {})) {
                            const cat = categories.find(c => c.id === catId);
                            if (cat && hours > 0) {
                                breakdown.push({ name: cat.name, hours: Math.round(hours * 10) / 10 });
                            }
                        }
                    } else {
                        level = 0;
                    }
                }

                return { level, date, totalHours, breakdown };
            })
        );
    }, [dateOffsetDays, todayTotalTime, todayCategoryBreakdown, history, categories]);

    const [hoveredCell, setHoveredCell] = useState<{
        data: CellData;
        rect: DOMRect;
    } | null>(null);

    const handleMouseEnter = (e: React.MouseEvent, data: CellData) => {
        if (data.level <= 0) return; // Skip empty and future cells
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
                                    backgroundColor: cell.level <= 0 ? 'var(--grid-base)' : 'var(--grid-active)',
                                    opacity: cell.level === -1 ? 0 : cell.level === 0 ? 1 : [0, 0.30, 0.50, 0.72, 1.0][cell.level],
                                    pointerEvents: cell.level === -1 ? 'none' : 'auto'
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
