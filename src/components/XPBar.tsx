'use client';
import { motion } from 'framer-motion';

export default function XPBar({
  ratio,
  label,
}: {
  ratio: number;
  label: string;
}) {
  const r = Math.max(0, Math.min(1, ratio || 0));
  return (
    <div className="w-full">
      <div className="h-2 rounded bg-muted/60 overflow-hidden">
        <motion.div
          className="h-2 bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${r * 100}%` }}
          transition={{ type: 'spring', stiffness: 80, damping: 20 }}
        />
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
