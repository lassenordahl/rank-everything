/**
 * Timer Progress Bar Component
 *
 * A full-width progress bar with black outline that fills from left to right
 * as time runs out. Shows seconds remaining in the center.
 */

interface TimerProgressBarProps {
  secondsRemaining: number;
  totalSeconds: number;
}

export default function TimerProgressBar({
  secondsRemaining,
  totalSeconds,
}: TimerProgressBarProps) {
  // Progress goes from 0 (full time) to 1 (no time left)
  const progress = Math.max(0, Math.min(1, 1 - secondsRemaining / totalSeconds));
  const isUrgent = secondsRemaining <= 5;

  return (
    <div className="w-full h-12 border-2 border-black relative bg-white overflow-hidden">
      {/* Fill bar */}
      <div
        className={`absolute inset-y-0 left-0 transition-all duration-1000 ease-linear ${
          isUrgent ? 'bg-red-600' : 'bg-black'
        }`}
        style={{ width: `${progress * 100}%` }}
      />
      {/* Centered text - uses mix-blend-difference for visibility on both bg colors */}
      <span className="absolute inset-0 flex items-center justify-center font-bold text-xl mix-blend-difference text-white">
        {secondsRemaining}s
      </span>
    </div>
  );
}
