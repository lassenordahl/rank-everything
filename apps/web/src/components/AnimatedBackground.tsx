import { useMemo } from 'react';
import { colors } from '../lib/design-tokens';

// Emoji pool - these tie into the game's emoji categorization feature
const EMOJI_POOL = [
  '🍕',
  '🎮',
  '🎵',
  '🎬',
  '📚',
  '☕',
  '🌮',
  '🍣',
  '✈️',
  '🎨',
  '⚽',
  '🎸',
  '🍦',
  '🌈',
  '🔥',
  '⭐',
  '🎯',
  '🎪',
  '🎭',
  '🎻',
  '🎹',
  '🎺',
  '🏀',
  '🎾',
  '🚀',
  '🎲',
  '🎤',
  '🍿',
  '🎧',
  '🌸',
  '🎁',
  '💎',
  '🦄',
  '🐶',
  '🌊',
  '🍔',
  '🎂',
  '🏆',
  '🎩',
  '🌙',
];

interface FloatingEmoji {
  id: number;
  emoji: string;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
}

function generateEmojis(count: number): FloatingEmoji[] {
  return Array.from({ length: count }, (_, i) => {
    const emojiIndex = Math.floor(Math.random() * EMOJI_POOL.length);
    return {
      id: i,
      emoji: EMOJI_POOL[emojiIndex] ?? '🎯',
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 20 + Math.random() * 30,
      duration: 15 + Math.random() * 20, // Slower animations
      delay: Math.random() * -15,
    };
  });
}

/**
 * Static CSS noise overlay - CSS-based for performance.
 * Uses CSS media query for responsive opacity (no JS resize listener).
 * Dual-layer noise for intense grain texture.
 */
function StaticNoiseOverlay() {
  return (
    <>
      {/* Primary noise layer - coarse grain */}
      <div
        className="absolute inset-0 pointer-events-none mix-blend-soft-light opacity-[0.90] md:opacity-[0.60]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '150px 150px',
        }}
      />
      {/* Secondary noise layer - fine grain */}
      <div
        className="absolute inset-0 pointer-events-none mix-blend-soft-light opacity-[0.50] md:opacity-[0.35]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise2'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise2)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '100px 100px',
        }}
      />
    </>
  );
}

/**
 * Floating Emojis - Pure CSS animations for GPU acceleration.
 * Reduced count from 48 to 16 for mobile performance.
 */
function FloatingEmojis() {
  // Generate emojis once on mount
  const emojis = useMemo(() => generateEmojis(32), []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {emojis.map((emoji) => (
        <div
          key={emoji.id}
          className="absolute select-none opacity-[0.25] will-change-transform animate-float"
          style={{
            left: `${emoji.x}%`,
            top: `${emoji.y}%`,
            fontSize: emoji.size,
            animationDuration: `${emoji.duration}s`,
            animationDelay: `${emoji.delay}s`,
          }}
        >
          {emoji.emoji}
        </div>
      ))}
    </div>
  );
}

/**
 * Static Gradient Orbs - No animation, pure CSS positioning.
 * Blur is reduced on mobile for GPU performance.
 * Desktop orbs are large to ensure full coverage over the red base.
 */
function GradientOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Blur container - lighter blur on mobile */}
      <div className="absolute inset-0 blur-[30px] md:blur-[80px]">
        {/* Coral/Red Orb - Top Left */}
        <div
          className="absolute w-[180vw] h-[180vw] md:w-[110vw] md:h-[110vw] rounded-full"
          style={{
            backgroundColor: colors.red.DEFAULT,
            top: '-40%',
            left: '-40%',
          }}
        />

        {/* Sky Blue Orb - Bottom Right */}
        <div
          className="absolute w-[180vw] h-[180vw] md:w-[100vw] md:h-[100vw] rounded-full"
          style={{
            backgroundColor: colors.blue.DEFAULT,
            bottom: '-50%',
            right: '-40%',
          }}
        />

        {/* Warm Yellow Orb - Center-ish */}
        <div
          className="absolute w-[100vw] h-[100vw] md:w-[80vw] md:h-[80vw] rounded-full"
          style={{
            backgroundColor: colors.yellow.DEFAULT,
            top: '30%',
            left: '30%',
          }}
        />

        {/* Purple Orb - Top Right (desktop only) */}
        <div
          className="absolute hidden md:block w-[70vw] h-[70vw] rounded-full opacity-60"
          style={{
            backgroundColor: colors.purple.DEFAULT,
            top: '-15%',
            right: '-10%',
          }}
        />

        {/* Green Orb - Bottom Left (desktop only) */}
        <div
          className="absolute hidden md:block w-[60vw] h-[60vw] rounded-full opacity-50"
          style={{
            backgroundColor: colors.green.DEFAULT,
            bottom: '-5%',
            left: '-5%',
          }}
        />
      </div>
    </div>
  );
}

function SubtleGrid() {
  return (
    <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
      {/* Horizontal center line */}
      <div className="absolute top-1/2 left-0 w-full h-px bg-black" />
      {/* Vertical center line */}
      <div className="absolute top-0 left-1/2 w-px h-full bg-black" />
      {/* Center crosshair marker */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-black font-mono text-xl">
        +
      </div>
    </div>
  );
}

/**
 * AnimatedBackground Component
 *
 * Performance optimized:
 * - Static gradient orbs (no JS animation)
 * - CSS-based floating emojis (GPU accelerated)
 * - Reduced emoji count (48 → 16)
 * - Lighter blur on mobile (30px vs 60px)
 * - Respects prefers-reduced-motion
 */
export function AnimatedBackground() {
  // Memoize static components
  const gradientOrbs = useMemo(() => <GradientOrbs />, []);
  const floatingEmojis = useMemo(() => <FloatingEmojis />, []);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-neutral-50 opacity-60 md:opacity-70 motion-reduce:!opacity-70">
      {/* Layer 1: Static gradient orbs */}
      {gradientOrbs}

      {/* Layer 2: CSS-animated floating emoji particles */}
      <div className="motion-reduce:hidden">{floatingEmojis}</div>

      {/* Layer 3: Static noise texture overlay (CSS-based) */}
      <StaticNoiseOverlay />

      {/* Layer 4: Subtle technical grid lines */}
      <SubtleGrid />
    </div>
  );
}
