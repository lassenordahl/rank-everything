/**
 * Design Showcase
 *
 * Visit localhost:5173/design to view this page
 *
 * This page displays all design tokens, components, and animations
 * for the Rank Everything design system.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, Copy, Dice5, Clock, ChevronRight, X, Check } from 'lucide-react';
import {
  colors,
  typographyClasses,
  componentClasses,
  animations,
  interactiveAnimations,
  transitions,
  getTimerState,
} from '../lib/design-tokens';
import {
  PlayerAvatar,
  RankingList,
  RoomCodeDisplay,
  PlayerList,
  Input,
  GameSubmission,
} from '../components/ui';

// ============================================================================
// SECTION COMPONENT
// ============================================================================

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="text-2xl font-bold mb-6 pb-2 border-b-2 border-black">{title}</h2>
      {children}
    </section>
  );
}

// ============================================================================
// COLOR SWATCHES
// ============================================================================

function ColorSwatch({ name, hex, className }: { name: string; hex: string; className: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-12 h-12 border-2 border-black ${className}`} title={hex} />
      <div>
        <p className="font-medium">{name}</p>
        <p className="text-sm text-neutral-500 font-mono">{hex}</p>
      </div>
    </div>
  );
}

function ColorSwatches() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {/* Core */}
      <ColorSwatch name="Background" hex={colors.background} className="bg-white" />
      <ColorSwatch name="Surface" hex={colors.surface} className="bg-neutral-50" />
      <ColorSwatch name="Border" hex={colors.border} className="bg-black" />
      <ColorSwatch name="Border Light" hex={colors.borderLight} className="bg-neutral-200" />

      {/* Text */}
      <ColorSwatch name="Text Primary" hex={colors.textPrimary} className="bg-black" />
      <ColorSwatch name="Text Secondary" hex={colors.textSecondary} className="bg-neutral-500" />
      <ColorSwatch name="Text Muted" hex={colors.textMuted} className="bg-neutral-400" />

      {/* Accents */}
      <ColorSwatch name="Red (Active)" hex={colors.red.DEFAULT} className="bg-red-500" />
      <ColorSwatch name="Red Light" hex={colors.red.light} className="bg-red-100" />
      <ColorSwatch name="Blue (Waiting)" hex={colors.blue.DEFAULT} className="bg-blue-500" />
      <ColorSwatch name="Blue Light" hex={colors.blue.light} className="bg-blue-100" />
      <ColorSwatch name="Green (Ready)" hex={colors.green.DEFAULT} className="bg-green-500" />
      <ColorSwatch name="Green Light" hex={colors.green.light} className="bg-green-100" />
      <ColorSwatch name="Yellow (Alert)" hex={colors.yellow.DEFAULT} className="bg-yellow-500" />
      <ColorSwatch name="Purple" hex={colors.purple.DEFAULT} className="bg-purple-500" />
    </div>
  );
}

// ============================================================================
// TYPOGRAPHY
// ============================================================================

function TypographyScale() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-neutral-500 mb-1">Display - Room codes, big numbers</p>
        <p className={typographyClasses.display}>ABCD</p>
      </div>
      <div>
        <p className="text-sm text-neutral-500 mb-1">H1 - Page titles</p>
        <p className={typographyClasses.h1}>Rank Everything</p>
      </div>
      <div>
        <p className="text-sm text-neutral-500 mb-1">H2 - Section headers</p>
        <p className={typographyClasses.h2}>Players (4)</p>
      </div>
      <div>
        <p className="text-sm text-neutral-500 mb-1">H3 - Card headers</p>
        <p className={typographyClasses.h3}>My Rankings</p>
      </div>
      <div>
        <p className="text-sm text-neutral-500 mb-1">Body - Default text</p>
        <p className={typographyClasses.body}>
          Enter something to rank and see how others rate it!
        </p>
      </div>
      <div>
        <p className="text-sm text-neutral-500 mb-1">Small - Secondary info</p>
        <p className={typographyClasses.small}>Waiting for other players...</p>
      </div>
      <div>
        <p className="text-sm text-neutral-500 mb-1">Caption - Labels, badges</p>
        <p className={typographyClasses.caption}>Room Code</p>
      </div>
      <div>
        <p className="text-sm text-neutral-500 mb-1">Mono - Codes, timers</p>
        <p className={`${typographyClasses.mono} text-2xl`}>49s</p>
      </div>
    </div>
  );
}

// ============================================================================
// BUTTONS
// ============================================================================

function ButtonShowcase() {
  return (
    <div className="space-y-8">
      {/* Primary Buttons */}
      <div>
        <p className="text-sm text-neutral-500 mb-3">Primary Buttons</p>
        <div className="flex flex-wrap gap-4">
          <motion.button
            className={componentClasses.buttonPrimary}
            {...interactiveAnimations.button}
          >
            Start Game
          </motion.button>
          <motion.button
            className={`${componentClasses.buttonPrimary} opacity-50 cursor-not-allowed`}
          >
            Start Game (Disabled)
          </motion.button>
        </div>
      </div>

      {/* Secondary Buttons */}
      <div>
        <p className="text-sm text-neutral-500 mb-3">Secondary Buttons</p>
        <div className="flex flex-wrap gap-4">
          <motion.button
            className={componentClasses.buttonSecondary}
            {...interactiveAnimations.button}
          >
            <Link className="w-4 h-4 inline mr-2" />
            Copy Link
          </motion.button>
          <motion.button
            className={componentClasses.buttonSecondary}
            {...interactiveAnimations.button}
          >
            Cancel
          </motion.button>
        </div>
      </div>

      {/* Accent Buttons */}
      <div>
        <p className="text-sm text-neutral-500 mb-3">Accent Buttons (Active State)</p>
        <div className="flex flex-wrap gap-4">
          <motion.button
            className={componentClasses.buttonAccent}
            {...interactiveAnimations.button}
          >
            Submit
          </motion.button>
          <motion.button
            className="border-2 border-blue-500 bg-blue-500 text-white px-6 py-3 font-semibold"
            {...interactiveAnimations.button}
          >
            Join Room
          </motion.button>
        </div>
      </div>

      {/* Icon Buttons */}
      <div>
        <p className="text-sm text-neutral-500 mb-3">Icon Buttons</p>
        <div className="flex flex-wrap gap-4">
          <motion.button
            className={componentClasses.buttonIcon}
            {...interactiveAnimations.iconButton}
          >
            <Copy className="w-5 h-5" />
          </motion.button>
          <motion.button
            className={componentClasses.buttonIcon}
            {...interactiveAnimations.iconButton}
          >
            <Dice5 className="w-5 h-5" />
          </motion.button>
          <motion.button
            className="border-2 border-black p-2 bg-black text-white"
            {...interactiveAnimations.iconButton}
          >
            <X className="w-5 h-5" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CARDS
// ============================================================================

function CardShowcase() {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Base Card */}
      <div className={componentClasses.cardPadded}>
        <h3 className="font-semibold mb-2">Base Card</h3>
        <p className="text-neutral-500">Simple card with padding and border.</p>
      </div>

      {/* Card with Header */}
      <div className={componentClasses.card}>
        <div className={componentClasses.cardHeader}>
          <h3 className="font-semibold">Card with Header</h3>
        </div>
        <div className="p-4">
          <p className="text-neutral-500">Content area with separate header.</p>
        </div>
      </div>

      {/* Interactive Card */}
      <motion.div
        className={`${componentClasses.cardPadded} cursor-pointer`}
        {...interactiveAnimations.cardElevate}
      >
        <h3 className="font-semibold mb-2">Interactive Card</h3>
        <p className="text-neutral-500">Hover to see the offset shadow effect.</p>
      </motion.div>

      {/* Settings Card */}
      <div className={componentClasses.card}>
        <div className={componentClasses.cardHeader}>
          <h3 className="font-semibold">Settings</h3>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex justify-between">
            <span className="text-neutral-500">Mode:</span>
            <span className="font-medium">round-robin</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">Timer:</span>
            <span className="font-medium">60s</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// INPUTS
// ============================================================================

function InputShowcase() {
  const [value, setValue] = useState('');

  return (
    <div className="space-y-6 max-w-md">
      {/* Basic Input */}
      <div>
        <p className="text-sm text-neutral-500 mb-2">Basic Input</p>
        <Input
          placeholder="Enter something to rank..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </div>

      {/* Input with Icon */}
      <div>
        <p className="text-sm text-neutral-500 mb-2">Input with Icon</p>
        <div className="flex border-2 border-black">
          <span className="flex items-center justify-center border-r-2 border-black px-3 bg-neutral-50">
            <span className="text-xl">AI...</span>
          </span>
          <Input
            className="border-0 focus:ring-0"
            placeholder="Enter something to rank..."
            fullWidth={true}
          />
        </div>
      </div>

      {/* Input with Button */}
      <div>
        <p className="text-sm text-neutral-500 mb-2">Input with Submit Button</p>
        <div className="flex gap-2">
          <Input placeholder="Your nickname..." />
          <motion.button
            className={componentClasses.buttonPrimary}
            {...interactiveAnimations.button}
          >
            Join
          </motion.button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SUBMISSION
// ============================================================================

function SubmissionShowcase() {
  const [value, setValue] = useState('');

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-neutral-500 mb-3">Game Submission Card</p>
        <GameSubmission
          value={value}
          onChange={setValue}
          onSubmit={() => console.log('Submit:', value)}
          onRandomClick={() => setValue('Random Item')}
          placeholder="Enter something..."
        />
      </div>
      <div>
        <p className="text-sm text-neutral-500 mb-3">Processing State</p>
        <GameSubmission
          value="Video Games"
          onChange={() => {}}
          onSubmit={() => {}}
          onRandomClick={() => {}}
          isClassifying={true}
          classifiedEmoji="🎮"
        />
      </div>
    </div>
  );
}

// ============================================================================
// PLAYER AVATARS
// ============================================================================

function AvatarShowcase() {
  const players = ['Lasse', 'Alex', 'Jordan', 'Taylor', 'Sam', 'Morgan', 'Casey', 'Riley'];
  const mockPlayers = players.slice(0, 4).map((name, i) => ({
    id: `player-${i}`,
    nickname: name,
    connected: true,
  }));

  return (
    <div className="space-y-6">
      {/* Avatar Grid - Using shared PlayerAvatar */}
      <div>
        <p className="text-sm text-neutral-500 mb-3">Player Avatars (by index)</p>
        <div className="flex flex-wrap gap-4">
          {players.map((name, i) => (
            <div key={name} className="flex items-center gap-2">
              <PlayerAvatar name={name} colorIndex={i} size="md" />
              <span className="text-sm">{name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Player List - Using shared PlayerList */}
      <div>
        <p className="text-sm text-neutral-500 mb-3">Player List (shared component)</p>
        <PlayerList players={mockPlayers} hostId="player-0" showCount={true} />
      </div>
    </div>
  );
}

// ============================================================================
// ROOM CODE DISPLAY
// ============================================================================

function RoomCodeShowcase() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-neutral-500 mb-3">Room Code Display (shared component)</p>
        <div className="max-w-md mx-auto border-2 border-black p-4">
          <RoomCodeDisplay code="YHCT" showCopyButton={true} showQRButton={true} />
        </div>
      </div>
      <div>
        <p className="text-sm text-neutral-500 mb-3">Room Code Display (shared component)</p>
        <div className="max-w-md mx-auto border-2 border-black p-4">
          <RoomCodeDisplay code="YHCT" showCopyButton={true} showQRButton={true} />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TIMER BAR
// ============================================================================

function TimerShowcase() {
  const [time, setTime] = useState(60);

  const percentRemaining = (time / 60) * 100;
  const timerState = getTimerState(percentRemaining);

  return (
    <div className="space-y-6">
      {/* Timer States */}
      <div>
        <p className="text-sm text-neutral-500 mb-3">Timer States</p>
        <div className="space-y-4">
          {/* Normal */}
          <div>
            <p className="text-xs text-neutral-400 mb-1">Normal (&gt;30%)</p>
            <div className={componentClasses.timerBar}>
              <div className={`${componentClasses.timerFill} bg-black`} style={{ width: '65%' }} />
              <span className={componentClasses.timerText}>39s</span>
            </div>
          </div>

          {/* Warning */}
          <div>
            <p className="text-xs text-neutral-400 mb-1">Warning (10-30%)</p>
            <div className={componentClasses.timerBar}>
              <div
                className={`${componentClasses.timerFill} bg-yellow-500`}
                style={{ width: '25%' }}
              />
              <span className={componentClasses.timerText}>15s</span>
            </div>
          </div>

          {/* Urgent */}
          <div>
            <p className="text-xs text-neutral-400 mb-1">Urgent (&lt;10%)</p>
            <div className={componentClasses.timerBar}>
              <motion.div
                className={`${componentClasses.timerFill} bg-red-500`}
                style={{ width: '8%' }}
                animate={{ opacity: [1, 0.7, 1] }}
                transition={{ repeat: Infinity, duration: 0.5 }}
              />
              <span className={componentClasses.timerText}>5s</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Timer */}
      <div>
        <p className="text-sm text-neutral-500 mb-3">Interactive Timer Demo</p>
        <div className={componentClasses.timerBar}>
          <motion.div
            className={`${componentClasses.timerFill} ${timerState.fill}`}
            animate={{
              width: `${percentRemaining}%`,
              opacity: timerState.pulse ? [1, 0.7, 1] : 1,
            }}
            transition={{
              width: { duration: 0.3 },
              opacity: timerState.pulse ? { repeat: Infinity, duration: 0.5 } : undefined,
            }}
          />
          <span className={componentClasses.timerText}>{time}s</span>
        </div>
        <div className="flex gap-2 mt-3">
          <button className="text-sm px-3 py-1 border border-black" onClick={() => setTime(60)}>
            Reset
          </button>
          <button
            className="text-sm px-3 py-1 border border-black"
            onClick={() => setTime(Math.max(0, time - 10))}
          >
            -10s
          </button>
          <button
            className="text-sm px-3 py-1 border border-black"
            onClick={() => setTime(Math.min(60, time + 10))}
          >
            +10s
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// STATUS BADGES
// ============================================================================

function BadgeShowcase() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-neutral-500 mb-3">Game State Badges</p>
        <div className="flex flex-wrap gap-4">
          <motion.div
            className={componentClasses.badgeActive}
            {...interactiveAnimations.subtlePulse}
          >
            Your turn!
          </motion.div>

          <div className={componentClasses.badgeWaiting}>
            <span className="animate-pulse">●</span>
            Waiting for others...
          </div>

          <div className={componentClasses.badgeSuccess}>
            <Check className="w-4 h-4" />
            Submitted
          </div>

          <div className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-700 px-4 py-2 font-medium">
            <Clock className="w-4 h-4" />
            Time running out!
          </div>
        </div>
      </div>

      {/* Inline badges */}
      <div>
        <p className="text-sm text-neutral-500 mb-3">Inline Badges</p>
        <div className="flex flex-wrap gap-3">
          <span className="text-xs font-medium uppercase tracking-wide bg-neutral-100 px-2 py-1">
            round-robin
          </span>
          <span className="text-xs font-medium uppercase tracking-wide bg-neutral-100 px-2 py-1">
            60s timer
          </span>
          <span className="text-xs font-medium uppercase tracking-wide bg-green-100 text-green-700 px-2 py-1">
            online
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// RANKINGS LIST
// ============================================================================

function RankingsShowcase() {
  // Mock data in the format RankingList expects
  const mockItems = [
    { id: 'item-1', text: 'Pizza', emoji: '🍕' },
    { id: 'item-2', text: 'Tacos', emoji: '🌮' },
    { id: 'item-3', text: 'Sushi', emoji: '🍣' },
  ];

  // Rankings: itemId -> rank
  const mockRankings: Record<string, number> = {
    'item-1': 1,
    'item-2': 2,
    'item-3': 3,
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-neutral-500 mb-3">Rankings List (shared component)</p>
        <div className="max-w-md">
          <RankingList
            rankings={mockRankings}
            items={mockItems}
            itemsPerGame={10}
            showHeader={true}
            headerTitle="My Rankings"
            animate={true}
          />
        </div>
      </div>
      <div>
        <p className="text-sm text-neutral-500 mb-3">Rankings List (shared component)</p>
        <div className="max-w-md">
          <RankingList
            rankings={mockRankings}
            items={mockItems}
            itemsPerGame={10}
            showHeader={true}
            headerTitle="My Rankings"
            animate={true}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ANIMATION DEMOS
// ============================================================================

function AnimationShowcase() {
  const [showCard, setShowCard] = useState(true);
  const [showList, setShowList] = useState(true);

  return (
    <div className="space-y-8">
      {/* Fade In Up */}
      <div>
        <div className="flex items-center gap-4 mb-3">
          <p className="text-sm text-neutral-500">Fade In Up</p>
          <button
            className="text-xs px-2 py-1 border border-black"
            onClick={() => setShowCard(!showCard)}
          >
            Toggle
          </button>
        </div>
        <AnimatePresence mode="wait">
          {showCard && (
            <motion.div
              className={componentClasses.cardPadded}
              variants={animations.fadeInUp}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={transitions.default}
            >
              <p>This card fades in from below</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Scale Pop */}
      <div>
        <p className="text-sm text-neutral-500 mb-3">Scale Pop (click the button)</p>
        <motion.button
          className={componentClasses.buttonPrimary}
          variants={animations.scalePop}
          initial="initial"
          animate="animate"
          whileTap={{ scale: 0.95 }}
          transition={transitions.spring}
        >
          Tap Me
        </motion.button>
      </div>

      {/* Stagger List */}
      <div>
        <div className="flex items-center gap-4 mb-3">
          <p className="text-sm text-neutral-500">Stagger Animation</p>
          <button
            className="text-xs px-2 py-1 border border-black"
            onClick={() => setShowList(!showList)}
          >
            Toggle
          </button>
        </div>
        <AnimatePresence>
          {showList && (
            <motion.div
              className="space-y-2"
              variants={animations.staggerContainer}
              initial="initial"
              animate="animate"
            >
              {['Item 1', 'Item 2', 'Item 3', 'Item 4'].map((item) => (
                <motion.div
                  key={item}
                  className="p-3 border-2 border-black bg-white"
                  variants={animations.staggerItem}
                  transition={transitions.default}
                >
                  {item}
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Hover Effects */}
      <div>
        <p className="text-sm text-neutral-500 mb-3">Interactive Hover Effects</p>
        <div className="flex gap-4">
          <motion.div
            className={`${componentClasses.cardPadded} cursor-pointer`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Scale on hover
          </motion.div>
          <motion.div
            className={`${componentClasses.cardPadded} cursor-pointer`}
            {...interactiveAnimations.cardElevate}
          >
            Offset shadow
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MOBILE PREVIEW GALLERY
// ============================================================================

// Phone frame wrapper component
function PhoneFrame({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="flex-shrink-0">
      <div className="w-[393px] h-[700px] border-4 border-black rounded-[40px] overflow-hidden bg-white shadow-lg">
        {/* Status Bar */}
        <div className="h-5 bg-black" />
        {/* Content */}
        <div className="h-[calc(100%-20px)] overflow-hidden">{children}</div>
      </div>
      <p className="text-center mt-2 text-xs text-neutral-500 font-medium">{label}</p>
    </div>
  );
}

// Home Page Preview
function HomePagePreview() {
  return (
    <div className="h-full flex flex-col items-center justify-center p-4">
      <h1 className="text-2xl font-bold mb-1">Rank Everything</h1>
      <p className="text-xs text-neutral-500 mb-6">A party game for opinionated people</p>
      <div className="w-full space-y-2">
        <button className="w-full py-2 border-2 border-black font-semibold text-sm hover:bg-black hover:text-white">
          Create Room
        </button>
        <button className="w-full py-2 border-2 border-black font-semibold text-sm hover:bg-black hover:text-white">
          Join Room
        </button>
      </div>
    </div>
  );
}

// Room Lobby Preview
function RoomLobbyPreview() {
  return (
    <div className="h-full flex flex-col p-4 space-y-4">
      {/* Room Code - using shared component in compact mode */}
      <RoomCodeDisplay code="YHCT" showCopyButton={false} />

      {/* Players List */}
      <PlayerList
        players={[
          { id: '1', nickname: 'Lasse', connected: true },
          { id: '2', nickname: 'Alex', connected: true },
          { id: '3', nickname: 'Jordan', connected: true },
        ]}
        hostId="1"
        showCount={true}
      />

      <button className="mt-auto py-2 bg-black text-white font-semibold text-sm border-2 border-black">
        Start Game
      </button>
    </div>
  );
}

// Game View - Your Turn Preview
function GameYourTurnPreview() {
  // Mock data for RankingList
  const mockItems = [
    { id: 'item-1', text: 'Pizza', emoji: '🍕' },
    { id: 'item-2', text: 'Tacos', emoji: '🌮' },
    { id: 'item-3', text: 'Sushi', emoji: '🍣' },
  ];
  const mockRankings: Record<string, number> = { 'item-1': 1, 'item-2': 2, 'item-3': 3 };

  return (
    <div className="h-full flex flex-col p-3">
      <div className="text-center mb-2">
        <p className="text-xs text-neutral-500">Room YHCT</p>
        <p className="font-bold text-sm">3 / 10 items</p>
      </div>

      {/* Timer */}
      <div className="h-6 border-2 border-black mb-2 relative overflow-hidden">
        <div className="absolute inset-y-0 left-0 bg-black w-[70%]" />
        <span className="absolute inset-0 flex items-center justify-center text-xs font-mono font-bold mix-blend-difference text-white">
          42s
        </span>
      </div>

      {/* Badge */}
      <div className="text-center mb-3">
        <span className="inline-flex px-3 py-1 bg-red-500 text-white text-sm font-bold">
          Your turn!
        </span>
      </div>

      {/* Input */}
      {/* Game Submission Input */}
      <div className="mb-3">
        <GameSubmission value="" onChange={() => {}} onSubmit={() => {}} onRandomClick={() => {}} />
      </div>

      {/* Mini Rankings - using shared RankingList */}
      <RankingList
        rankings={mockRankings}
        items={mockItems}
        itemsPerGame={10}
        showHeader={true}
        headerTitle="My Rankings"
      />
    </div>
  );
}

// Game View - Waiting Preview
function GameWaitingPreview() {
  // Mock data for RankingList
  const mockItems = [
    { id: 'item-1', text: 'Pizza', emoji: '🍕' },
    { id: 'item-2', text: 'Tacos', emoji: '🌮' },
    { id: 'item-3', text: 'Sushi', emoji: '🍣' },
  ];
  const mockRankings: Record<string, number> = { 'item-1': 1, 'item-2': 2, 'item-3': 3 };

  return (
    <div className="h-full flex flex-col p-3">
      <div className="text-center mb-2">
        <p className="text-xs text-neutral-500">Room YHCT</p>
        <p className="font-bold text-sm">5 / 10 items</p>
      </div>

      {/* Timer */}
      <div className="h-6 border-2 border-black mb-2 relative overflow-hidden">
        <div className="absolute inset-y-0 left-0 bg-black w-[45%]" />
        <span className="absolute inset-0 flex items-center justify-center text-xs font-mono font-bold mix-blend-difference text-white">
          27s
        </span>
      </div>

      {/* Badge */}
      <div className="text-center mb-3">
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium">
          <span className="animate-pulse">●</span> Waiting for Alex...
        </span>
      </div>

      {/* Current Item to Rank */}
      <div className="border-2 border-black p-3 text-center mb-3">
        <p className="text-3xl mb-1">🎮</p>
        <p className="font-bold text-sm">Video Games</p>
        <p className="text-xs text-neutral-500 mt-1">Choose a slot</p>
        <div className="grid grid-cols-5 gap-1 mt-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <button
              key={n}
              className={`p-1 border border-black text-xs font-bold ${
                [1, 2, 3].includes(n) ? 'opacity-30 bg-neutral-100' : ''
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Mini Rankings - using shared RankingList */}
      <RankingList
        rankings={mockRankings}
        items={mockItems}
        itemsPerGame={10}
        showHeader={true}
        headerTitle="My Rankings"
      />
    </div>
  );
}

// Reveal Screen Preview
function RevealScreenPreview() {
  // Mock data for RankingList
  const mockItems = [
    { id: 'item-1', text: 'Pizza', emoji: '🍕' },
    { id: 'item-2', text: 'Video Games', emoji: '🎮' },
    { id: 'item-3', text: 'Tacos', emoji: '🌮' },
    { id: 'item-4', text: 'Coffee', emoji: '☕' },
    { id: 'item-5', text: 'Sushi', emoji: '🍣' },
  ];
  const mockRankings: Record<string, number> = {
    'item-1': 1,
    'item-2': 2,
    'item-3': 3,
    'item-4': 4,
    'item-5': 5,
  };

  return (
    <div className="h-full flex flex-col p-3">
      <div className="text-center mb-3">
        <h1 className="text-xl font-bold">Game Over!</h1>
        <p className="text-xs text-neutral-500">Room YHCT</p>
      </div>

      {/* Player Selector - using shared PlayerAvatar */}
      <div className="flex items-center justify-center gap-2 mb-3">
        <button className="p-1 border border-black text-xs">←</button>
        <div className="flex items-center gap-2">
          <PlayerAvatar name="Lasse" colorIndex={0} size="sm" />
          <div>
            <p className="font-bold text-sm">
              Lasse <span className="text-neutral-500 text-xs">(you)</span>
            </p>
            <p className="text-xs text-neutral-500">1 of 3</p>
          </div>
        </div>
        <button className="p-1 border border-black text-xs">→</button>
      </div>

      <RankingList
        rankings={mockRankings}
        items={mockItems}
        itemsPerGame={10}
        showHeader={true}
        headerTitle="Lasse's Rankings"
      />

      {/* Actions */}
      <div className="mt-2 space-y-1">
        <button className="w-full py-1 border-2 border-black text-xs font-semibold">
          📸 Screenshot
        </button>
        <div className="flex gap-1">
          <button className="flex-1 py-1 bg-black text-white text-xs font-semibold border-2 border-black">
            Play Again
          </button>
          <button className="flex-1 py-1 border-2 border-black text-xs font-semibold">Exit</button>
        </div>
      </div>
    </div>
  );
}

function MobilePreview() {
  return (
    <div className="space-y-6">
      <p className="text-sm text-neutral-500">
        All main screens at a glance. Each screen uses the shared design system.
      </p>

      {/* Vertical grid of phone previews */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center">
        <PhoneFrame label="Home">
          <HomePagePreview />
        </PhoneFrame>

        <PhoneFrame label="Room Lobby">
          <RoomLobbyPreview />
        </PhoneFrame>

        <PhoneFrame label="Your Turn">
          <GameYourTurnPreview />
        </PhoneFrame>

        <PhoneFrame label="Waiting">
          <GameWaitingPreview />
        </PhoneFrame>

        <PhoneFrame label="Reveal">
          <RevealScreenPreview />
        </PhoneFrame>
      </div>
    </div>
  );
}

// ============================================================================
// EMOJI SHOWCASE
// ============================================================================

function EmojiShowcase() {
  const items = [
    { name: 'Pizza', emoji: '🍕' },
    { name: 'Tacos', emoji: '🌮' },
    { name: 'Sushi', emoji: '🍣' },
    { name: 'Coffee', emoji: '☕' },
    { name: 'Video Games', emoji: '🎮' },
    { name: 'Travel', emoji: '✈️' },
    { name: 'Music', emoji: '🎵' },
    { name: 'Books', emoji: '📚' },
  ];

  return (
    <div className="space-y-6">
      <p className="text-sm text-neutral-500">
        Emojis bring color and personality to the minimal UI
      </p>

      {/* Emoji Grid */}
      <div className="grid grid-cols-4 gap-4">
        {items.map((item) => (
          <motion.div
            key={item.name}
            className={`${componentClasses.cardPadded} text-center cursor-pointer`}
            {...interactiveAnimations.cardElevate}
          >
            <span className="text-4xl">{item.emoji}</span>
            <p className="text-sm mt-2">{item.name}</p>
          </motion.div>
        ))}
      </div>

      {/* Item with Emoji Badge */}
      <div>
        <p className="text-sm text-neutral-500 mb-3">Items with Emoji Badges</p>
        <div className="space-y-2 max-w-sm">
          {items.slice(0, 3).map((item, i) => (
            <div key={item.name} className="flex items-center gap-3 p-3 border-2 border-black">
              <span className="font-bold text-neutral-400">{i + 1}.</span>
              <span className="flex-1 font-medium">{item.name}</span>
              <span className="text-2xl">{item.emoji}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function DesignShowcase() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b-2 border-black sticky top-0 bg-white z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Design System</h1>
          <a href="/" className="text-sm text-neutral-500 hover:text-black flex items-center gap-1">
            Back to App <ChevronRight className="w-4 h-4" />
          </a>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Intro */}
        <div className="mb-12 p-6 border-2 border-black bg-neutral-50">
          <h2 className="text-2xl font-bold mb-2">Rank Everything</h2>
          <p className="text-neutral-600 mb-4">
            A mobile-first party game with clean editorial aesthetics. White canvas, bold borders,
            emojis bring the color.
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="text-xs font-medium uppercase tracking-wide bg-white border border-black px-2 py-1">
              React + TypeScript
            </span>
            <span className="text-xs font-medium uppercase tracking-wide bg-white border border-black px-2 py-1">
              Tailwind CSS
            </span>
            <span className="text-xs font-medium uppercase tracking-wide bg-white border border-black px-2 py-1">
              Framer Motion
            </span>
          </div>
        </div>

        {/* Sections */}
        <Section title="Colors">
          <ColorSwatches />
        </Section>

        <Section title="Typography">
          <TypographyScale />
        </Section>

        <Section title="Buttons">
          <ButtonShowcase />
        </Section>

        <Section title="Cards">
          <CardShowcase />
        </Section>

        <Section title="Inputs">
          <InputShowcase />
        </Section>

        <Section title="Game Submission">
          <SubmissionShowcase />
        </Section>

        <Section title="Avatars & Lists">
          <AvatarShowcase />
        </Section>

        <Section title="Room Code">
          <RoomCodeShowcase />
        </Section>

        <Section title="Timer Bar">
          <TimerShowcase />
        </Section>

        <Section title="Status Badges">
          <BadgeShowcase />
        </Section>

        <Section title="Rankings List">
          <RankingsShowcase />
        </Section>

        <Section title="Emojis">
          <EmojiShowcase />
        </Section>

        <Section title="Animations">
          <AnimationShowcase />
        </Section>

        <Section title="Mobile Preview">
          <MobilePreview />
        </Section>
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-black mt-12 py-6">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-neutral-500">
          <p>Design System for Rank Everything</p>
          <p className="mt-1">
            See <code className="bg-neutral-100 px-1 py-0.5 text-xs">specs/DESIGN_SPEC.md</code> for
            full documentation
          </p>
        </div>
      </footer>
    </div>
  );
}
