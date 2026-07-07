

export default function ContributionGrid() {
  const days = 7;
  const blocksPerDay = 30;

  return (
    <div className="contribution-grid">
      {Array.from({ length: days }).map((_, rowIndex) => (
        <div key={rowIndex} className="contribution-row">
          {Array.from({ length: blocksPerDay }).map((_, colIndex) => {
            const intensity = Math.random() > 0.4 ? Math.random() : 0;
            return (
              <div
                key={colIndex}
                className="contribution-cell"
                style={{
                  opacity: intensity > 0 ? 0.2 + intensity * 0.8 : 1,
                  backgroundColor: intensity > 0 ? 'var(--grid-active)' : 'var(--grid-base)',
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
