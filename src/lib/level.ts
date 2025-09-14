export const LEVEL_THRESHOLDS = [
  0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700,
]; // level 1..10

export function levelForXP(xp: number): number {
  const x = Math.max(0, Math.floor(xp || 0));
  let lvl = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (x >= LEVEL_THRESHOLDS[i]) {
      lvl = i + 1;
      break;
    }
  }
  return Math.min(lvl, 10);
}

export function thresholdForLevel(level: number): number {
  const idx = Math.max(1, Math.min(10, Math.floor(level))) - 1;
  return LEVEL_THRESHOLDS[idx];
}

export function nextThresholdForLevel(level: number): number | null {
  const idx = Math.max(1, Math.min(10, Math.floor(level))) - 1;
  if (idx >= LEVEL_THRESHOLDS.length - 1) return null;
  return LEVEL_THRESHOLDS[idx + 1];
}

export function progressForXP(xp: number) {
  const level = levelForXP(xp);
  const start = thresholdForLevel(level);
  const next = nextThresholdForLevel(level);
  const into = Math.max(0, (xp || 0) - start);
  const span = next == null ? 1 : Math.max(1, next - start);
  const ratio = Math.max(0, Math.min(1, into / span));
  return { level, start, next, into, span, ratio };
}
