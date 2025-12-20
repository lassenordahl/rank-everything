import { motion } from 'framer-motion';
import { colors } from '../lib/design-tokens';
import { useEffect, useRef, useState, useMemo } from 'react';

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
  rotation: number;
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
      duration: 20 + Math.random() * 40,
      delay: Math.random() * -30,
      rotation: Math.random() * 360,
    };
  });
}

function NoiseCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let frameCount = 0;

    const resize = () => {
      // Lower res for performance and that crunchy texture
      canvas.width = Math.ceil(window.innerWidth / 3);
      canvas.height = Math.ceil(window.innerHeight / 3);
    };

    const render = () => {
      // Throttle noise update to every 3 frames for performance + staccato feel
      if (frameCount % 3 === 0) {
        const imageData = ctx.createImageData(canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          const value = Math.random() * 255;
          data[i] = value; // R
          data[i + 1] = value; // G
          data[i + 2] = value; // B
          data[i + 3] = 20; // Alpha - subtle blend
        }

        ctx.putImageData(imageData, 0, 0);
      }

      frameCount++;
      animationFrameId = requestAnimationFrame(render);
    };

    window.addEventListener('resize', resize);
    resize();
    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full opacity-50 mix-blend-overlay pointer-events-none"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}

function FloatingEmojis() {
  const [emojis] = useState(() => generateEmojis(24));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {emojis.map((emoji) => (
        <motion.div
          key={emoji.id}
          className="absolute select-none opacity-[0.15]"
          style={{
            left: `${emoji.x}%`,
            top: `${emoji.y}%`,
            fontSize: emoji.size,
          }}
          initial={{
            y: 0,
            x: 0,
            rotate: emoji.rotation,
          }}
          animate={{
            y: [0, -30, 0, 30, 0],
            x: [0, 20, 0, -20, 0],
            rotate: [
              emoji.rotation,
              emoji.rotation + 15,
              emoji.rotation,
              emoji.rotation - 15,
              emoji.rotation,
            ],
          }}
          transition={{
            duration: emoji.duration,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: emoji.delay,
          }}
        >
          {emoji.emoji}
        </motion.div>
      ))}
    </div>
  );
}

function GradientOrbs() {
  return (
    <div className="absolute inset-0 opacity-70 overflow-hidden">
      {/* Primary gradient blur layer */}
      <div className="absolute inset-0 blur-[120px]">
        {/* Coral/Red Orb - Top Left */}
        <motion.div
          className="absolute w-[70vw] h-[70vw] rounded-full"
          style={{
            backgroundColor: colors.red.DEFAULT,
            top: '-20%',
            left: '-20%',
          }}
          animate={{
            x: [0, 100, 50, 0],
            y: [0, 50, 100, 0],
            scale: [1, 1.2, 1.1, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Sky Blue Orb - Bottom Right */}
        <motion.div
          className="absolute w-[60vw] h-[60vw] rounded-full"
          style={{
            backgroundColor: colors.blue.DEFAULT,
            bottom: '-15%',
            right: '-15%',
          }}
          animate={{
            x: [0, -80, -40, 0],
            y: [0, -60, -100, 0],
            scale: [1, 1.3, 1.15, 1],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Warm Yellow Orb - Center-ish */}
        <motion.div
          className="absolute w-[50vw] h-[50vw] rounded-full"
          style={{
            backgroundColor: colors.yellow.DEFAULT,
            top: '30%',
            left: '30%',
          }}
          animate={{
            x: [0, 60, -40, 0],
            y: [0, -40, 60, 0],
            scale: [1, 1.1, 0.95, 1],
          }}
          transition={{
            duration: 22,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Purple Orb - Top Right (accent) */}
        <motion.div
          className="absolute w-[40vw] h-[40vw] rounded-full opacity-60"
          style={{
            backgroundColor: colors.purple.DEFAULT,
            top: '-5%',
            right: '10%',
          }}
          animate={{
            x: [0, -50, 0, 50, 0],
            y: [0, 80, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 28,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Green Orb - Bottom Left (subtle) */}
        <motion.div
          className="absolute w-[35vw] h-[35vw] rounded-full opacity-50"
          style={{
            backgroundColor: colors.green.DEFAULT,
            bottom: '5%',
            left: '5%',
          }}
          animate={{
            x: [0, 40, 20, 0],
            y: [0, -50, 0],
            scale: [1, 1.15, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'easeInOut',
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

export function AnimatedBackground() {
  // Memoize to prevent re-renders
  const gradientOrbs = useMemo(() => <GradientOrbs />, []);
  const floatingEmojis = useMemo(() => <FloatingEmojis />, []);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-[#f5f5f5]">
      {/* Layer 1: Animated gradient orbs */}
      {gradientOrbs}

      {/* Layer 2: Floating emoji particles */}
      {floatingEmojis}

      {/* Layer 3: Noise texture overlay */}
      <NoiseCanvas />

      {/* Layer 4: Subtle technical grid lines */}
      <SubtleGrid />
    </div>
  );
}
