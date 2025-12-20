import { useState, useEffect, useRef } from 'react';

/**
 * Timer Progress Bar Component
 *
 * A full-width progress bar with black outline that fills from left to right
 * as time runs out. Shows seconds remaining in the center.
 *
 * Performance Optimized: Handles its own internal interval to prevent
 * parent re-renders.
 */

interface TimerProgressBarProps {
  timerEndAt: number;
  totalSeconds: number;
}

export default function TimerProgressBar({ timerEndAt, totalSeconds }: TimerProgressBarProps) {
  const [now, setNow] = useState(Date.now());
  const requestRef = useRef<number>();

  // Use RAF for smoother updates than setInterval
  useEffect(() => {
    const update = () => {
      setNow(Date.now());
      requestRef.current = requestAnimationFrame(update);
    };

    requestRef.current = requestAnimationFrame(update);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  const secondsRemaining = Math.max(0, Math.ceil((timerEndAt - now) / 1000));

  // Progress goes from 0 (full time) to 1 (no time left)
  // Calculate distinct progress for smoother bar vs discrete number
  const msRemaining = Math.max(0, timerEndAt - now);
  const progress = Math.max(0, Math.min(1, 1 - msRemaining / (totalSeconds * 1000)));

  const isUrgent = secondsRemaining <= 5;
  const isWarning = secondsRemaining <= 15 && !isUrgent;

  return (
    <div className="w-full h-12 border-2 border-black relative bg-white overflow-hidden">
      {/* Fill bar */}
      <div
        className={`absolute inset-y-0 left-0 transition-transform duration-100 ease-linear origin-left ${
          isUrgent ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-black'
        }`}
        style={{ transform: `scaleX(${progress})`, width: '100%' }}
      />
      {/* Centered text - uses mix-blend-difference for visibility on both bg colors */}
      <span className="absolute inset-0 flex items-center justify-center font-bold text-xl mix-blend-difference text-white font-mono">
        {secondsRemaining}s
      </span>
    </div>
  );
}
