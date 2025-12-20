import { useState, useEffect, useRef } from 'react';

/**
 * Timer Progress Bar Component
 *
 * A full-width progress bar with black outline that starts full and depletes
 * from right to left as time runs out. Shows seconds remaining in the center.
 *
 * Performance Optimized: Uses CSS for smooth animation, JS only for time tracking.
 */

interface TimerProgressBarProps {
  timerEndAt: number;
  totalSeconds: number;
}

export default function TimerProgressBar({ timerEndAt, totalSeconds }: TimerProgressBarProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(() =>
    Math.max(0, Math.ceil((timerEndAt - Date.now()) / 1000))
  );
  const barRef = useRef<HTMLDivElement>(null);

  // Use CSS animation for smooth progress bar (GPU accelerated, no jank)
  // Only update JS state for the seconds display
  useEffect(() => {
    // Set initial width based on remaining time
    const msRemaining = Math.max(0, timerEndAt - Date.now());
    const initialProgress = Math.max(0, Math.min(1, msRemaining / (totalSeconds * 1000)));

    if (barRef.current) {
      // Start at current remaining percentage, animate to 0
      barRef.current.style.transition = 'none';
      barRef.current.style.width = `${initialProgress * 100}%`;

      // Force reflow before adding transition
      void barRef.current.offsetHeight;

      // Animate to 0% over the remaining time
      barRef.current.style.transition = `width ${msRemaining}ms linear`;
      barRef.current.style.width = '0%';
    }

    // Update seconds display at 1 second intervals (not every frame)
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((timerEndAt - Date.now()) / 1000));
      setSecondsRemaining(remaining);
    }, 100);

    return () => clearInterval(interval);
  }, [timerEndAt, totalSeconds]);

  const isUrgent = secondsRemaining <= 5;
  const isWarning = secondsRemaining <= 15 && !isUrgent;

  return (
    <div className="w-full h-12 border-2 border-black relative bg-white overflow-hidden">
      {/* Fill bar - starts full (100%) and depletes to 0% */}
      <div
        ref={barRef}
        className={`absolute inset-y-0 left-0 will-change-[width] ${
          isUrgent ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-black'
        }`}
        style={{ width: '100%' }}
      />
      {/* Centered text - uses mix-blend-difference for visibility on both bg colors */}
      <span className="absolute inset-0 flex items-center justify-center font-bold text-xl mix-blend-difference text-white font-mono">
        {secondsRemaining}s
      </span>
    </div>
  );
}
