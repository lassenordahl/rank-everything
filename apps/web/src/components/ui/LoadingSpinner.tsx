import { useState, useEffect } from 'react';

interface LoadingSpinnerProps {
  /** Delay in milliseconds before spinner appears (default: 500) */
  delayMs?: number;
  /** Optional custom class name */
  className?: string;
}

export function LoadingSpinner({ delayMs = 500, className = '' }: LoadingSpinnerProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);

  if (!show) return null;

  return (
    <div
      className={`absolute inset-0 flex items-center justify-center z-50 pointer-events-none ${className}`}
    >
      <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default LoadingSpinner;
