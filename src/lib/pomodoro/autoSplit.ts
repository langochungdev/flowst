export interface SplitResult {
  blocks: number;
  workPerBlock: number[];
  breakPerBlock: number;
}

export function autoSplit(T: number, B: number): SplitResult {
  const idealBlock = 25;
  const minBlock = 15;
  const maxBlock = 30;

  let bestN = 1;
  let bestDiff = Infinity;

  for (let n = 1; n <= 20; n++) {
    const totalBreaks = (n - 1) * B;
    if (T <= totalBreaks) continue; // Invalid
    
    const workPerBlock = (T - totalBreaks) / n;
    
    if (workPerBlock >= minBlock && workPerBlock <= maxBlock) {
      const diff = Math.abs(workPerBlock - idealBlock);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestN = n;
      }
    }
  }

  // If no n found in range, fallback to simple division or closest 
  if (bestDiff === Infinity) {
    bestN = Math.max(1, Math.round(T / idealBlock));
  }

  const totalBreaks = (bestN - 1) * B;
  const totalWork = T - totalBreaks;
  
  // Distribute remaining minutes
  const baseWork = Math.floor(totalWork / bestN);
  let remainder = totalWork % bestN;

  const workPerBlock = Array(bestN).fill(baseWork);
  for (let i = 0; i < remainder; i++) {
    workPerBlock[i] += 1;
  }

  return {
    blocks: bestN,
    workPerBlock,
    breakPerBlock: B,
  };
}
