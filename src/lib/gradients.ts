export function levelGradient(level: number) {
  // Nice escalating palette 1..10
  const map: Record<number, { from: string; to: string }> = {
    1: { from: '#64748b', to: '#94a3b8' }, // slate
    2: { from: '#3b82f6', to: '#60a5fa' }, // blue
    3: { from: '#06b6d4', to: '#22d3ee' }, // cyan
    4: { from: '#10b981', to: '#34d399' }, // emerald
    5: { from: '#84cc16', to: '#a3e635' }, // lime
    6: { from: '#eab308', to: '#facc15' }, // yellow
    7: { from: '#f59e0b', to: '#fbbf24' }, // amber
    8: { from: '#ef4444', to: '#f87171' }, // red
    9: { from: '#a855f7', to: '#c084fc' }, // purple
    10: { from: '#ec4899', to: '#f472b6' }, // pink
  };
  return map[Math.min(10, Math.max(1, level))];
}
