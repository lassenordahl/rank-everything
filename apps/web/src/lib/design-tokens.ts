/**
 * Design Tokens for Rank Everything
 *
 * This file contains exportable constants for colors, typography,
 * spacing, and Framer Motion animation presets.
 *
 * @see specs/DESIGN_SPEC.md for full documentation
 */

// ============================================================================
// COLORS
// ============================================================================

export const colors = {
  // Core
  background: '#FFFFFF',
  surface: '#FAFAFA',
  border: '#000000',
  borderLight: '#E5E5E5',

  // Text
  textPrimary: '#000000',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',

  // Accents
  red: {
    DEFAULT: '#EF4444',
    light: '#FEE2E2',
  },
  blue: {
    DEFAULT: '#3B82F6',
    light: '#DBEAFE',
  },
  green: {
    DEFAULT: '#22C55E',
    light: '#DCFCE7',
  },
  yellow: {
    DEFAULT: '#EAB308',
    light: '#FEF9C3',
  },
  purple: {
    DEFAULT: '#8B5CF6',
    light: '#EDE9FE',
  },
} as const;

// Tailwind class mappings
export const colorClasses = {
  background: 'bg-white',
  surface: 'bg-neutral-50',
  border: 'border-black',
  borderLight: 'border-neutral-200',
  textPrimary: 'text-black',
  textSecondary: 'text-neutral-500',
  textMuted: 'text-neutral-400',

  // Accent backgrounds
  redBg: 'bg-red-500',
  redBgLight: 'bg-red-100',
  blueBg: 'bg-blue-500',
  blueBgLight: 'bg-blue-100',
  greenBg: 'bg-green-500',
  greenBgLight: 'bg-green-100',
  yellowBg: 'bg-yellow-500',
  yellowBgLight: 'bg-yellow-100',
  purpleBg: 'bg-purple-500',
  purpleBgLight: 'bg-purple-100',

  // Accent text
  redText: 'text-red-500',
  blueText: 'text-blue-500',
  greenText: 'text-green-500',
  yellowText: 'text-yellow-500',
  purpleText: 'text-purple-500',
} as const;

// ============================================================================
// PLAYER AVATAR COLORS
// ============================================================================

export const avatarColors = [
  { bg: 'bg-green-500', text: 'text-white', hex: '#22C55E' },
  { bg: 'bg-blue-500', text: 'text-white', hex: '#3B82F6' },
  { bg: 'bg-red-500', text: 'text-white', hex: '#EF4444' },
  { bg: 'bg-yellow-500', text: 'text-black', hex: '#EAB308' },
  { bg: 'bg-purple-500', text: 'text-white', hex: '#8B5CF6' },
  { bg: 'bg-pink-500', text: 'text-white', hex: '#EC4899' },
  { bg: 'bg-orange-500', text: 'text-white', hex: '#F97316' },
  { bg: 'bg-cyan-500', text: 'text-white', hex: '#06B6D4' },
] as const;

type AvatarColor = (typeof avatarColors)[number];

export function getAvatarColor(index: number): AvatarColor {
  // Array is guaranteed non-empty, so modulo access is safe
  return avatarColors[index % avatarColors.length] as AvatarColor;
}

// ============================================================================
// TYPOGRAPHY
// ============================================================================

export const typography = {
  // Font families
  fontFamily: {
    sans: 'Inter, system-ui, -apple-system, sans-serif',
    mono: 'JetBrains Mono, ui-monospace, monospace',
  },

  // Font sizes (px)
  fontSize: {
    display: 48,
    h1: 32,
    h2: 24,
    h3: 20,
    body: 16,
    small: 14,
    caption: 12,
  },

  // Line heights
  lineHeight: {
    display: 1.0,
    h1: 1.2,
    h2: 1.3,
    h3: 1.4,
    body: 1.5,
    small: 1.5,
    caption: 1.4,
  },

  // Font weights
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
} as const;

// Tailwind class combinations
export const typographyClasses = {
  display: 'text-5xl font-bold tracking-wider font-mono',
  h1: 'text-3xl font-bold',
  h2: 'text-2xl font-semibold',
  h3: 'text-xl font-semibold',
  body: 'text-base',
  small: 'text-sm text-neutral-500',
  caption: 'text-xs font-medium uppercase tracking-wide',
  mono: 'font-mono',
} as const;

// ============================================================================
// SPACING
// ============================================================================

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
} as const;

export const spacingClasses = {
  xs: 'p-1',
  sm: 'p-2',
  md: 'p-4',
  lg: 'p-6',
  xl: 'p-8',
  '2xl': 'p-12',
} as const;

// ============================================================================
// BORDERS
// ============================================================================

export const borders = {
  width: {
    default: 2,
    thin: 1,
  },
  radius: {
    none: 0,
    sm: 4,
    md: 8,
    lg: 12,
    full: 9999,
  },
} as const;

export const borderClasses = {
  default: 'border-2 border-black',
  thin: 'border border-neutral-200',
  radiusNone: 'rounded-none',
  radiusSm: 'rounded-sm',
  radiusMd: 'rounded-md',
  radiusLg: 'rounded-lg',
  radiusFull: 'rounded-full',
} as const;

// ============================================================================
// SHADOWS
// ============================================================================

export const shadows = {
  none: 'none',
  offset: '2px 2px 0 0 #000',
  offsetSm: '1px 1px 0 0 #000',
  offsetLg: '4px 4px 0 0 #000',
} as const;

// ============================================================================
// FRAMER MOTION ANIMATIONS
// ============================================================================

import type { Variants, Transition } from 'framer-motion';

// Transition presets
export const transitions = {
  fast: { duration: 0.15 } as Transition,
  default: { duration: 0.2 } as Transition,
  slow: { duration: 0.3 } as Transition,
  spring: { type: 'spring', stiffness: 500, damping: 30 } as Transition,
  springBouncy: { type: 'spring', stiffness: 400, damping: 20 } as Transition,
} as const;

// Animation variants
export const animations = {
  // Fade in from bottom (for cards, modals)
  fadeInUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
  } as Variants,

  // Fade in (simple)
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  } as Variants,

  // Scale pop (for buttons, interactive elements)
  scalePop: {
    initial: { scale: 0.95, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.95, opacity: 0 },
  } as Variants,

  // Slide in from left
  slideInLeft: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  } as Variants,

  // Slide in from right
  slideInRight: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
  } as Variants,

  // Stagger container (for lists)
  staggerContainer: {
    animate: {
      transition: {
        staggerChildren: 0.05,
      },
    },
  } as Variants,

  // Stagger item (use with staggerContainer)
  staggerItem: {
    initial: { opacity: 0, x: -10 },
    animate: { opacity: 1, x: 0 },
  } as Variants,
} as const;

// Interactive animation props (for whileHover, whileTap)
export const interactiveAnimations = {
  // Button hover/tap
  button: {
    whileHover: { scale: 1.02 },
    whileTap: { scale: 0.98 },
    transition: transitions.spring,
  },

  // Card hover with offset shadow
  cardElevate: {
    whileHover: { x: -2, y: -2, boxShadow: shadows.offsetLg },
    whileTap: { x: 0, y: 0, boxShadow: shadows.none },
    transition: transitions.fast,
  },

  // Icon button
  iconButton: {
    whileHover: { scale: 1.1 },
    whileTap: { scale: 0.9 },
    transition: transitions.spring,
  },

  // Shake (for errors)
  shake: {
    animate: {
      x: [0, -10, 10, -10, 10, 0],
    },
    transition: { duration: 0.4 },
  },

  // Pulse (for attention)
  pulse: {
    animate: {
      scale: [1, 1.05, 1],
    },
    transition: { repeat: Infinity, duration: 2 },
  },

  // Subtle pulse (for "your turn" state)
  subtlePulse: {
    animate: {
      scale: [1, 1.02, 1],
    },
    transition: { repeat: Infinity, duration: 2 },
  },
};

// ============================================================================
// COMPONENT PRESETS
// ============================================================================

// Pre-built class combinations for common components
export const componentClasses = {
  // Cards
  card: 'border-2 border-black bg-white',
  cardPadded: 'border-2 border-black bg-white p-4',
  cardHeader: 'border-b-2 border-black px-4 py-3',

  // Buttons
  buttonBase: 'border-2 border-black px-6 py-3 font-semibold transition-colors',
  buttonPrimary: 'border-2 border-black bg-black text-white px-6 py-3 font-semibold',
  buttonSecondary:
    'border-2 border-black bg-white text-black px-6 py-3 font-semibold hover:bg-black hover:text-white',
  buttonAccent: 'border-2 border-red-500 bg-red-500 text-white px-6 py-3 font-semibold',
  buttonIcon: 'border-2 border-black p-2 bg-white hover:bg-black hover:text-white',

  // Inputs
  input:
    'w-full border-2 border-black px-4 py-3 text-base placeholder:text-neutral-400 focus:outline-none focus:shadow-[0_0_0_2px_black] transition-shadow',

  // Avatar
  avatar:
    'w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm border-2 border-black',

  // Badges
  badgeActive: 'inline-flex items-center gap-2 bg-red-500 text-white px-4 py-2 font-bold',
  badgeWaiting: 'inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 font-medium',
  badgeSuccess: 'inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 font-medium',

  // Timer
  timerBar: 'relative h-10 border-2 border-black bg-white overflow-hidden',
  timerFill: 'absolute inset-y-0 left-0 bg-black',
  timerText:
    'absolute inset-0 flex items-center justify-center font-mono font-bold text-lg mix-blend-difference text-white',

  // Layout
  bottomBar: 'fixed bottom-0 left-0 right-0 bg-white border-t-2 border-black p-4',
} as const;

// ============================================================================
// GAME STATE STYLES
// ============================================================================

export const gameStateStyles = {
  yourTurn: {
    badge: 'bg-red-500 text-white',
    border: 'border-red-500',
    text: 'text-red-500',
  },
  waiting: {
    badge: 'bg-blue-100 text-blue-700',
    border: 'border-blue-500',
    text: 'text-blue-500',
  },
  submitted: {
    badge: 'bg-green-100 text-green-700',
    border: 'border-green-500',
    text: 'text-green-500',
  },
  warning: {
    badge: 'bg-yellow-100 text-yellow-700',
    border: 'border-yellow-500',
    text: 'text-yellow-500',
  },
} as const;

// Timer state based on percentage remaining
export function getTimerState(percentRemaining: number) {
  if (percentRemaining <= 10) {
    return { fill: 'bg-red-500', pulse: true };
  }
  if (percentRemaining <= 30) {
    return { fill: 'bg-yellow-500', pulse: false };
  }
  return { fill: 'bg-black', pulse: false };
}
