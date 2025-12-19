# Design Specification

> Living design document for Rank Everything - a mobile-first party game with clean editorial aesthetics

## Design Philosophy

**Core Principles:**

1. **White canvas, bold borders** - Clean white backgrounds with confident 2px black borders
2. **Emojis bring the color** - The UI stays minimal; emojis provide personality and visual interest
3. **State-driven accents** - Red and blue communicate game states clearly
4. **Playful tactility** - Animations should feel responsive and fun
5. **Mobile-first** - Designed for phones held during in-person play

---

## Design Tokens

### Colors

```
┌─────────────────────────────────────────────────────────────┐
│  CORE PALETTE                                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Background     #FFFFFF   ████████████████  Pure white       │
│  Surface        #FAFAFA   ████████████████  Subtle off-white │
│  Border         #000000   ████████████████  Bold black       │
│  Border Light   #E5E5E5   ████████████████  Subtle dividers  │
│                                                              │
│  Text Primary   #000000   ████████████████  Headlines        │
│  Text Secondary #6B7280   ████████████████  Supporting text  │
│  Text Muted     #9CA3AF   ████████████████  Disabled/hints   │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│  ACCENT COLORS                                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Red (Active)   #EF4444   ████████████████  "Your turn!"     │
│  Red Light      #FEE2E2   ████████████████  Red backgrounds  │
│                                                              │
│  Blue (Waiting) #3B82F6   ████████████████  "Waiting..."     │
│  Blue Light     #DBEAFE   ████████████████  Blue backgrounds │
│                                                              │
│  Green (Ready)  #22C55E   ████████████████  Player online    │
│  Green Light    #DCFCE7   ████████████████  Success states   │
│                                                              │
│  Yellow (Alert) #EAB308   ████████████████  Timer warning    │
│  Yellow Light   #FEF9C3   ████████████████  Warning bg       │
│                                                              │
│  Purple         #8B5CF6   ████████████████  Special actions  │
│  Purple Light   #EDE9FE   ████████████████  Purple bg        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Tailwind Classes:**

```css
/* Backgrounds */
bg-white                /* Primary background */
bg-neutral-50           /* Surface/card background */

/* Borders */
border-2 border-black   /* Primary borders */
border border-neutral-200  /* Subtle borders */

/* Text */
text-black              /* Primary text */
text-neutral-500        /* Secondary text */
text-neutral-400        /* Muted text */

/* Accents */
bg-red-500 text-white   /* Active state */
bg-blue-500 text-white  /* Waiting state */
bg-green-500            /* Online indicator */
```

---

### Typography

**Font Stack:**

```
Primary: Inter (system-ui fallback)
Mono: JetBrains Mono (monospace fallback)
```

**Scale:**

```
┌──────────────────────────────────────────────────────────────┐
│  TYPOGRAPHY SCALE                                             │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Display    48px/1.0   font-bold    Room codes, big numbers  │
│  H1         32px/1.2   font-bold    Page titles              │
│  H2         24px/1.3   font-semibold Section headers         │
│  H3         20px/1.4   font-semibold Card headers            │
│  Body       16px/1.5   font-normal  Default text             │
│  Small      14px/1.5   font-normal  Secondary info           │
│  Caption    12px/1.4   font-medium  Labels, badges           │
│                                                               │
│  Mono       16px/1.5   font-mono    Codes, timers            │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

**Tailwind Classes:**

```css
/* Display - Room codes */
text-5xl font-bold tracking-wider font-mono

/* H1 - Page titles */
text-3xl font-bold

/* H2 - Section headers */
text-2xl font-semibold

/* H3 - Card headers */
text-xl font-semibold

/* Body */
text-base

/* Small */
text-sm text-neutral-500

/* Caption */
text-xs font-medium uppercase tracking-wide
```

---

### Spacing

**Base unit:** 4px

```
┌───────────────────────────────────────────────────────────┐
│  SPACING SCALE                                             │
├───────────────────────────────────────────────────────────┤
│                                                            │
│  xs      4px    p-1     Tight padding                     │
│  sm      8px    p-2     Icon padding                      │
│  md     16px    p-4     Default padding                   │
│  lg     24px    p-6     Card padding                      │
│  xl     32px    p-8     Section spacing                   │
│  2xl    48px    p-12    Page margins                      │
│                                                            │
│  GAPS                                                      │
│  gap-2   8px    Between inline elements                   │
│  gap-4  16px    Between stacked cards                     │
│  gap-6  24px    Between sections                          │
│                                                            │
└───────────────────────────────────────────────────────────┘
```

---

### Border Radius

```
┌───────────────────────────────────────────────────────────┐
│  BORDER RADIUS                                             │
├───────────────────────────────────────────────────────────┤
│                                                            │
│  none     0px     rounded-none    Cards, inputs           │
│  sm       4px     rounded-sm      Badges, small buttons   │
│  md       8px     rounded-md      Buttons                 │
│  lg      12px     rounded-lg      Modals                  │
│  full   9999px    rounded-full    Player avatars, pills   │
│                                                            │
│  DEFAULT: Use rounded-none for cards to maintain          │
│           the editorial/architectural feel                │
│                                                            │
└───────────────────────────────────────────────────────────┘
```

---

### Shadows

```
┌───────────────────────────────────────────────────────────┐
│  SHADOWS                                                   │
├───────────────────────────────────────────────────────────┤
│                                                            │
│  none          Default - rely on borders instead          │
│  sm            Hover states on buttons                    │
│  offset-black  2px 2px 0 black - playful offset shadow   │
│                                                            │
│  PHILOSOPHY: Minimal shadows. Bold borders do the work.   │
│                                                            │
└───────────────────────────────────────────────────────────┘
```

**Custom Shadow (add to tailwind.config.js):**

```js
boxShadow: {
  'offset': '2px 2px 0 0 #000',
  'offset-sm': '1px 1px 0 0 #000',
}
```

---

## Component Patterns

### Cards

**Base Card**

```tsx
<div className="border-2 border-black bg-white p-4">{/* Card content */}</div>
```

**Card with Header**

```tsx
<div className="border-2 border-black bg-white">
  <div className="border-b-2 border-black px-4 py-3">
    <h3 className="font-semibold">Card Title</h3>
  </div>
  <div className="p-4">{/* Card content */}</div>
</div>
```

**Elevated Card (interactive)**

```tsx
<motion.div
  className="border-2 border-black bg-white p-4 cursor-pointer"
  whileHover={{ x: -2, y: -2, boxShadow: '4px 4px 0 0 #000' }}
  whileTap={{ x: 0, y: 0, boxShadow: '0 0 0 0 #000' }}
>
  {/* Card content */}
</motion.div>
```

---

### Buttons

**Primary Button**

```tsx
<motion.button
  className="border-2 border-black bg-black text-white px-6 py-3 font-semibold"
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
>
  Start Game
</motion.button>
```

**Secondary Button**

```tsx
<motion.button
  className="border-2 border-black bg-white text-black px-6 py-3 font-semibold"
  whileHover={{ backgroundColor: '#000', color: '#fff' }}
  whileTap={{ scale: 0.98 }}
>
  Copy Link
</motion.button>
```

**Accent Button (Active State)**

```tsx
<motion.button
  className="border-2 border-red-500 bg-red-500 text-white px-6 py-3 font-semibold"
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
>
  Submit
</motion.button>
```

**Icon Button**

```tsx
<motion.button
  className="border-2 border-black p-2 bg-white"
  whileHover={{ backgroundColor: '#000', color: '#fff' }}
  whileTap={{ scale: 0.95 }}
>
  <Icon className="w-5 h-5" />
</motion.button>
```

---

### Inputs

**Text Input**

```tsx
<input
  type="text"
  className="w-full border-2 border-black px-4 py-3 text-base
             placeholder:text-neutral-400
             focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
  placeholder="Enter something to rank..."
/>
```

**Input with Icon**

```tsx
<div className="flex border-2 border-black">
  <span className="flex items-center justify-center border-r-2 border-black px-3 bg-neutral-50">
    <Icon className="w-5 h-5" />
  </span>
  <input type="text" className="flex-1 px-4 py-3 focus:outline-none" placeholder="Enter text..." />
</div>
```

---

### Player Avatar

**Circle with Initial**

```tsx
<div
  className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center
                text-white font-bold text-sm border-2 border-black"
>
  L
</div>
```

**Avatar Colors by Player Index:**

```tsx
const avatarColors = [
  'bg-green-500', // Player 1
  'bg-blue-500', // Player 2
  'bg-red-500', // Player 3
  'bg-yellow-500', // Player 4
  'bg-purple-500', // Player 5
  'bg-pink-500', // Player 6
  'bg-orange-500', // Player 7
  'bg-cyan-500', // Player 8
];
```

---

### Room Code Display

```tsx
<div className="text-center">
  <p className="text-sm text-neutral-500 uppercase tracking-wide">Room Code</p>
  <h1 className="text-5xl font-bold tracking-[0.3em] font-mono mt-1">YHCT</h1>
</div>
```

---

### Timer Bar

**Full Width Timer**

```tsx
<div className="relative h-10 border-2 border-black bg-white overflow-hidden">
  <motion.div
    className="absolute inset-y-0 left-0 bg-black"
    initial={{ width: '100%' }}
    animate={{ width: `${percentRemaining}%` }}
    transition={{ duration: 1, ease: 'linear' }}
  />
  <span
    className="absolute inset-0 flex items-center justify-center font-mono font-bold text-lg
                   mix-blend-difference text-white"
  >
    {seconds}s
  </span>
</div>
```

**Timer States:**

- `> 30%`: Black fill
- `10-30%`: Yellow fill (warning)
- `< 10%`: Red fill (urgent)

---

### Ranking List

```tsx
<div className="border-2 border-black bg-white">
  <div className="border-b-2 border-black px-4 py-3">
    <h3 className="font-semibold">My Rankings</h3>
  </div>
  <div className="divide-y divide-neutral-200">
    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rank) => (
      <div key={rank} className="flex items-center px-4 py-3 gap-3">
        <span className="font-bold text-neutral-400 w-6">{rank}.</span>
        <span className="flex-1">{item?.name ?? '—'}</span>
        {item?.emoji && <span className="text-xl">{item.emoji}</span>}
      </div>
    ))}
  </div>
</div>
```

---

### Status Badges

**Your Turn Badge**

```tsx
<motion.div
  className="inline-flex items-center gap-2 bg-red-500 text-white px-4 py-2 font-bold"
  animate={{ scale: [1, 1.02, 1] }}
  transition={{ repeat: Infinity, duration: 2 }}
>
  Your turn!
</motion.div>
```

**Waiting Badge**

```tsx
<div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 font-medium">
  <span className="animate-pulse">●</span>
  Waiting for others...
</div>
```

---

## Animation Presets

### Framer Motion Variants

```ts
// Fade in from bottom (for cards, modals)
export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.2 },
};

// Scale pop (for buttons, interactive elements)
export const scalePop = {
  initial: { scale: 0.95, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.95, opacity: 0 },
  transition: { type: 'spring', stiffness: 500, damping: 30 },
};

// Stagger children (for lists)
export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export const staggerItem = {
  initial: { opacity: 0, x: -10 },
  animate: { opacity: 1, x: 0 },
};

// Shake (for errors)
export const shake = {
  animate: {
    x: [0, -10, 10, -10, 10, 0],
    transition: { duration: 0.4 },
  },
};

// Pulse (for attention)
export const pulse = {
  animate: {
    scale: [1, 1.05, 1],
    transition: { repeat: Infinity, duration: 2 },
  },
};
```

### CSS Transitions

```css
/* Default transition for hover states */
transition-all duration-150 ease-out

/* Smooth color transitions */
transition-colors duration-200

/* Transform transitions */
transition-transform duration-100
```

---

## Mobile-First Patterns

### Bottom Fixed Input Bar

```tsx
<div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-black p-4 pb-safe">
  <div className="flex gap-2">
    <input className="flex-1 border-2 border-black px-4 py-3" placeholder="Enter something..." />
    <button className="border-2 border-black bg-black text-white px-6 py-3 font-semibold">
      Submit
    </button>
  </div>
</div>
```

### Safe Area Handling

```css
/* Add to global CSS */
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom, 16px);
}
```

### Touch Targets

- Minimum 44x44px for all interactive elements
- Use `py-3` (12px) minimum for buttons
- Add generous padding around tap zones

---

## Inspiration Log

### 2024-12-19 - Initial Inspiration Batch

**Source: Music OS / Homepod Concept**

- **Adopted:** Colored circle badges for player avatars (A, E, T style)
- **Adopted:** Clean white surface with subtle gray
- **Noted:** High contrast black graphic elements

**Source: Pocket Operator**

- **Adopted:** Bold black borders (already in use)
- **Adopted:** Industrial/LCD aesthetic for timers
- **Noted:** Purple accent could work for special actions (random roll?)

**Source: Last Call Party Game**

- **Adopted:** Red and blue as primary accent pair
- **Adopted:** Party game energy in typography
- **Noted:** Neon glow effect could be used sparingly for highlights

**Source: Awnings for NY**

- **Adopted:** Editorial typography with weight contrast
- **Adopted:** Red as signature accent color
- **Adopted:** Confident use of whitespace

**Source: Existing App**

- **Keep:** Bold 2px black borders
- **Keep:** Monospace room codes
- **Keep:** Card-based layout
- **Enhance:** Add more animation to interactions
- **Enhance:** Use accent colors more deliberately for game states

---

## Decision Log

| Date       | Decision                                            | Rationale                                                   |
| ---------- | --------------------------------------------------- | ----------------------------------------------------------- |
| 2024-12-19 | Use `border-2 border-black` as default border style | Matches editorial/architectural inspiration, already in app |
| 2024-12-19 | Red for "your turn", Blue for "waiting"             | Clear state communication, matches party game inspiration   |
| 2024-12-19 | No rounded corners on cards                         | Maintains architectural feel from Awnings inspiration       |
| 2024-12-19 | Emojis are the primary color source                 | Keeps UI minimal while adding personality through content   |
| 2024-12-19 | Use Framer Motion for all interactions              | Enables playful, tactile feel aligned with party game genre |

---

## Agent Instructions

### Adding New Inspiration

When the user shares new inspiration images:

1. **Analyze** the image for relevant patterns (colors, typography, spacing, animations, components)
2. **Add entry** to the Inspiration Log with:
   - Date
   - Source description
   - What was adopted
   - What was noted for later
3. **Propose updates** to specific tokens or components
4. **Update the /design route** to preview changes
5. **Wait for user feedback** before applying to the actual app

### Updating Design Tokens

When updating `design-tokens.ts`:

1. Ensure all Tailwind classes are documented
2. Update Framer Motion presets if animations change
3. Keep the DESIGN_SPEC.md in sync

### Applying to App Components

Only apply design changes to app components when:

1. The user explicitly approves after reviewing `/design`
2. The change has been documented in the Decision Log
3. The change doesn't break existing functionality

---

## Files Reference

| File                                    | Purpose                                 |
| --------------------------------------- | --------------------------------------- |
| `specs/DESIGN_SPEC.md`                  | This file - living design documentation |
| `apps/web/src/lib/design-tokens.ts`     | Exportable design constants             |
| `apps/web/src/pages/DesignShowcase.tsx` | Component showcase at /design           |
