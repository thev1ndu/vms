'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { levelGradient } from '@/lib/gradients';
import { useEffect, useRef, useState } from 'react';

function usePrevious<T>(v: T) {
  const r = useRef<T | undefined>(undefined);
  useEffect(() => {
    r.current = v;
  }, [v]);
  return r.current;
}

export default function LevelBadge({
  level,
  label,
}: {
  level: number;
  label?: string;
}) {
  const prev = usePrevious(level);
  const [boom, setBoom] = useState(false);
  useEffect(() => {
    if (prev !== undefined && level > (prev as number)) {
      setBoom(true);
      const t = setTimeout(() => setBoom(false), 900);
      return () => clearTimeout(t);
    }
  }, [level, prev]);

  const g = levelGradient(level);

  return (
    <div className="relative inline-flex items-center">
      <div
        className="relative grid place-items-center rounded-full"
        style={{
          width: 56,
          height: 56,
          boxShadow: '0 0 0 2px rgba(0,0,0,.05) inset',
        }}
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `conic-gradient(${g.from}, ${g.to})`,
            filter: 'blur(1px)',
            opacity: 0.9,
          }}
        />
        <div className="absolute inset-[3px] rounded-full bg-background" />
        <div
          className="relative z-10 rounded-full grid place-items-center text-sm font-semibold"
          style={{ width: 44, height: 44, color: '#111' }}
        >
          L{level}
        </div>
      </div>

      <AnimatePresence>
        {boom && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.6, scale: 1.4 }}
            exit={{ opacity: 0, scale: 1.8 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="absolute -inset-1 rounded-full"
            style={{
              background: `radial-gradient(ellipse at center, ${g.to}33, transparent 60%)`,
            }}
          />
        )}
      </AnimatePresence>

      {label && (
        <span className="ml-3 text-sm text-muted-foreground">{label}</span>
      )}
    </div>
  );
}
