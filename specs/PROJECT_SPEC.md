# Rank Everything - Project Specification

> **Status**: Initial Draft
> **Last Updated**: 2025-12-18
> **Target Implementation**: Opus 4.5 one-shot build

---

## 1. Product Overview

### 1.1 Vision & Goals

**Rank Everything** is a digital party game that transforms a popular in-person ranking game into a seamless web experience. The game creates moments of hilarious decision-making and sparks conversation as players strategically rank an unpredictable mix of items from 1-10.

**Core Goals:**
- Make it effortless to play the physical game digitally (like Jackbox.tv)
- Facilitate in-person and remote play with minimal friction
- Create shareable, Spotify Wrapped-style moments at game end
- Keep the interface dead simple and fast

### 1.2 Target Users

- Friend groups playing together in-person (on their phones)
- Remote friend groups over video calls
- Party hosts looking for easy icebreaker activities
- People who enjoy games like Jackbox, Cards Against Humanity, Wavelength

### 1.3 Core Value Proposition

**The Problem:** The physical game is fun but players forget what they ranked and in what order. It's hard to track and compare.

**The Solution:** A beautifully simple web app that:
- Tracks everyone's rankings automatically
- Makes room creation as easy as sharing a 4-letter code
- Reveals rankings in a satisfying, shareable format
- Works seamlessly on phones during in-person play

---

## 2. Functional Requirements

### 2.1 Game Modes

#### Primary Mode: Custom Room
Players create a private room and come up with items together.

#### Secondary Mode: Daily Challenge
A Wordle-style daily game where everyone worldwide gets the same item list. Separate from custom rooms.

### 2.2 Core Features

#### Feature 1: Room Creation & Joining
- **Room Codes**: 4-letter random codes (e.g., "WXYZ")
- **Nickname Entry**: Players choose a display name when joining
- **Semi-Persistent Rooms**: Rooms stay alive for 10 minutes after last player leaves (for reconnections)
- **Reconnection**: Players can refresh and rejoin if they lose connection

#### Feature 2: Room Configuration (Pre-Game)
Host configures before starting the game:
- **Submission Mode**:
  - Round-robin (players take turns)
  - Host-only (host submits all items)
- **Round Timer**:
  - Default: 60 seconds
  - Adjustable
  - Can be disabled entirely
- **Player Management**: Invite more players before starting

#### Feature 3: Gameplay Loop
1. A player's turn to submit (enforced turn order)
2. Player types an item (anything: nouns, concepts, situations, events, etc.)
   - Max 100 characters (server-configurable via .env)
   - Exact duplicates rejected (error message)
   - Similar items allowed ("1 orange" vs "2 oranges")
3. Item appears for all players simultaneously
4. Each player independently ranks it 1-10 on their personal list
   - 1 = best, 10 = worst
   - **Rankings are permanent** (can't be changed once set)
5. Next player's turn

**While Waiting for Submission:**
- Display: "Waiting for [Player Name]..."
- Optional timer countdown (if enabled)
- Players only see their own ranking list (rankings are private)

#### Feature 4: Random Roll
Two interaction modes:
- **Browse Mode**: Click to cycle through random items from global database, then confirm selection
- **YOLO Mode**: Button instantly submits a random item without preview

**Data Source**: Any item ever submitted in any game (anonymized, no author attribution in random roll)

**In-Game Context**: Items submitted during current game show who submitted them

#### Feature 5: Emoji Assignment
- Every item automatically gets an assigned emoji
- Provides visual interest and color to otherwise minimal interface
- **Implementation**: Haiku API call for intelligent emoji selection
  - Cost absorbed with usage cap
  - Future: attempt local browser LLM implementation

#### Feature 6: Game End & Reveal
When all 10 slots are filled:
- **Animation**: Spotify Wrapped-style reveal
- **Screenshot Feature**: Save image of your ranking list
- **Carousel View**: Browse other players' rankings for discussion
- **Post-Game Options**:
  - Start new game with same room
  - Invite more players and start fresh

### 2.3 User Flows

#### Flow A: Creating & Playing a Custom Room

```
1. Land on homepage
2. Click "Create Room"
3. Enter nickname
4. Configure room settings:
   - Submission mode (round-robin / host-only)
   - Round timer (60s default, adjustable, or off)
5. Get 4-letter room code
6. Share code with friends
7. Friends join via "Join Room" → enter code → enter nickname
8. Host clicks "Start Game"
9. Game begins (turn-based submission + ranking)
10. After 10 items, reveal screen
11. View carousel of everyone's rankings
12. Screenshot & share
13. Option to play again or exit
```

#### Flow B: Daily Challenge

```
1. Land on homepage
2. Click "Play Daily Challenge"
3. Enter nickname
4. Play through pre-determined 10-item list
5. See reveal screen
6. Compare with global stats (optional future feature)
```

#### Flow C: Reconnection Flow

```
1. Player loses connection during game
2. Player refreshes page
3. "Reconnect to room [CODE]?" prompt appears
4. Click reconnect
5. Resume game with current state preserved
```

### 2.4 Edge Cases & Constraints

**Edge Cases:**
- Player submits exact duplicate → Show error, require different submission
- Player disconnects → Room stays alive 10min, allows reconnection
- All players leave → Room deleted after 10min TTL
- Player joins mid-game → Not allowed (game in progress)
- Player tries to change ranking → Not allowed (rankings are locked)

**Constraints:**
- Max 100 characters per submission (configurable)
- 10 ranking slots (fixed)
- Room code must be unique
- No profanity filter (trust-based, private rooms)

---

## 3. User Experience

### 3.1 Customer Journeys

#### Journey 1: In-Person Friend Group
Sarah hosts a game night with 6 friends.
1. Sarah creates room on her phone, gets code "TACO"
2. Shouts "Join TACO!" to the group
3. Everyone joins on their phones in 30 seconds
4. Sarah picks round-robin mode, 60s timer
5. Game starts, people are dying laughing at juxtapositions
6. Rankings are private but people discuss out loud ("I'm gonna rank this high!")
7. Game ends, reveal screen shows everyone's wild rankings
8. Screenshots fly in the group chat
9. "One more round!"

#### Journey 2: Remote Video Call
Friends on Zoom want to play together.
1. Host creates room, shares code in Zoom chat
2. Everyone joins from their computers
3. Play proceeds over video call
4. Discussion happens verbally while ranking privately
5. Reveal creates great conversation starters

### 3.2 Design Requirements

**Visual Style:**
- White background
- Bold black lines and borders
- Black sans-serif font (clean, modern)
- Emoji accents as ONLY source of color
- Minimalist, uncluttered interface

**Design References:**
- Jackbox.tv (room joining simplicity)
- Spotify Wrapped (reveal animation aesthetic)
- Wordle (daily challenge concept, clean minimal design)

### 3.3 Interaction Patterns

**Mobile-First:**
- Primary target: Phone browsers (in-person play)
- Secondary: Desktop browsers (remote play)
- Large touch targets, minimal typing
- Fast, instant feedback

**Real-Time Sync:**
- When someone submits item → appears for everyone simultaneously
- No polling delays, feels instant

**Progressive Disclosure:**
- Only show relevant UI for current game state
- Hide complexity until needed

---

## 4. Technical Specification

### 4.1 Architecture Overview

**High-Level Architecture:**
- Web application (URL-based, no app store required)
- Real-time multiplayer using WebSockets
- Serverless or lightweight backend
- Client-side rendering with real-time state sync
- Database for room state, item history, daily challenges

**Key Requirements:**
- Sub-second latency for item submissions
- Reliable reconnection handling
- Horizontal scaling for concurrent rooms
- Cost-effective at small scale

### 4.2 Technology Stack

**Monorepo Structure:**
- **Build System**: Turborepo or npm workspaces
- **Shared**: TypeScript types between frontend/backend
- **Directories**: `/apps/web`, `/apps/api`, `/packages/shared-types`

**Frontend:**
- **Framework**: React 18+
- **Build Tool**: Vite
- **UI Library**: shadcn/ui (customizable, headless components)
- **Styling**: Tailwind CSS (via shadcn/ui)
- **Fonts**: System fonts (no custom font loading)
- **Animations**: None for v1 (Framer Motion planned for v2)
- **WebSocket Client**: Native WebSocket API
- **Hosting**: Cloudflare Pages

**Backend:**
- **Runtime**: Cloudflare Workers (Node.js-compatible)
- **Real-time**: PartyKit (built on Cloudflare Durable Objects)
  - Simplifies WebSocket room management
  - Free tier included with Cloudflare
- **API**: REST + WebSocket via PartyKit
- **Language**: TypeScript

**Database:**
- **Room State**: Cloudflare Durable Objects (in-memory, ephemeral)
- **Room Metadata Cache**: Cloudflare KV (key-value store with TTL)
- **Item History**: Cloudflare D1 (SQLite, for global item pool)
- **Daily Challenges**: Not in v1 (planned for v2)

**External Services:**
- **Anthropic API**: Haiku for emoji assignment
  - Fallback: Random emoji on failure
  - Usage cap enforced server-side

**Development:**
- **Type Safety**: Shared TypeScript types across monorepo
- **Environment**: .env files per app
- **Package Manager**: pnpm (recommended for monorepos)

### 4.3 Data Models

#### Room
```
{
  id: string (4-letter code)
  hostPlayerId: string
  config: {
    submissionMode: "round-robin" | "host-only"
    timerEnabled: boolean
    timerDuration: number (seconds)
  }
  status: "lobby" | "in-progress" | "ended"
  players: Player[]
  items: Item[]
  currentTurnPlayerId: string
  createdAt: timestamp
  lastActivityAt: timestamp
  ttlExpiresAt: timestamp
}
```

#### Player
```
{
  id: string (generated)
  nickname: string
  roomId: string
  connected: boolean
  rankings: { [itemId: string]: number } // itemId -> ranking (1-10)
  joinedAt: timestamp
}
```

#### Item
```
{
  id: string (generated)
  text: string (max 100 chars)
  emoji: string
  submittedByPlayerId: string
  submittedAt: timestamp
  roomId: string
}
```

#### Global Item Pool (for random roll)
```
{
  id: string
  text: string
  emoji: string
  createdAt: timestamp
  // No author info (anonymized)
}
```

#### Daily Challenge
```
{
  date: string (YYYY-MM-DD)
  items: Item[] (10 pre-determined items)
  generatedAt: timestamp
}
```

### 4.4 API Specifications

**REST Endpoints:**

```
POST   /api/rooms                    Create room, returns room code
GET    /api/rooms/:code              Get room state
POST   /api/rooms/:code/join         Join room with nickname
POST   /api/rooms/:code/start        Start game (host only)
DELETE /api/rooms/:code/leave        Leave room
GET    /api/daily-challenge          Get today's daily challenge
GET    /api/random-items             Get random items for roll feature
```

**WebSocket Events:**

```
Client → Server:
- submit_item: { text: string }
- rank_item: { itemId: string, ranking: number }
- reconnect: { playerId: string, roomCode: string }
- start_timer: {}

Server → Client:
- room_updated: { room: Room }
- item_submitted: { item: Item }
- player_joined: { player: Player }
- player_left: { playerId: string }
- turn_changed: { playerId: string }
- timer_tick: { secondsRemaining: number }
- game_ended: {}
- error: { message: string }
```

### 4.5 External Dependencies

**Required:**
- **Anthropic API (Haiku)**: Emoji assignment
  - Cost: ~$0.0001 per call
  - Fallback: Random emoji if API fails
  - Usage cap: Set in server .env

**Optional/Future:**
- Local browser LLM (WebLLM, Transformers.js) for emoji assignment
- Analytics (PostHog, Plausible, etc.)

**Configuration (.env):**
```
MAX_ITEM_LENGTH=100
ROOM_TTL_MINUTES=10
ANTHROPIC_API_KEY=xxx
ANTHROPIC_USAGE_CAP_DAILY=1000
```

---

## 5. Implementation Details

### 5.1 File Structure

**Monorepo Structure:**
```
/
├── apps/
│   ├── web/                          # Cloudflare Pages (React)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── ui/              # shadcn/ui components
│   │   │   │   ├── HomePage.tsx
│   │   │   │   ├── RoomLobby.tsx
│   │   │   │   ├── GameView.tsx
│   │   │   │   ├── RankingList.tsx
│   │   │   │   ├── RevealScreen.tsx
│   │   │   │   └── RandomRollModal.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useWebSocket.ts
│   │   │   │   └── useRoom.ts
│   │   │   ├── lib/
│   │   │   │   └── utils.ts
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   ├── public/
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.ts
│   │   └── package.json
│   │
│   └── api/                          # Cloudflare Workers
│       ├── src/
│       │   ├── index.ts             # Worker entry point
│       │   ├── durable-objects/
│       │   │   └── GameRoom.ts      # Durable Object for WebSocket room
│       │   ├── handlers/
│       │   │   ├── rooms.ts         # REST API handlers
│       │   │   └── items.ts
│       │   ├── services/
│       │   │   ├── emoji.ts         # Haiku API integration
│       │   │   └── random-roll.ts
│       │   └── utils/
│       │       ├── validation.ts
│       │       └── room-codes.ts
│       ├── wrangler.toml            # Cloudflare config
│       └── package.json
│
├── packages/
│   └── shared-types/                # Shared TypeScript types
│       ├── src/
│       │   ├── Room.ts
│       │   ├── Player.ts
│       │   ├── Item.ts
│       │   ├── WebSocketEvents.ts
│       │   └── index.ts
│       ├── tsconfig.json
│       └── package.json
│
├── specs/                           # This directory
│   └── PROJECT_SPEC.md
│
├── turbo.json                       # Turborepo config
├── package.json                     # Root package.json
├── pnpm-workspace.yaml
├── .env.example
└── README.md
```

### 5.2 Key Components

**Frontend Components (React + shadcn/ui):**

**Pages/Views:**
- **HomePage** (`HomePage.tsx`)
  - Create Room button
  - Join Room button (input for code)
  - Daily Challenge button (v2)

- **RoomLobby** (`RoomLobby.tsx`)
  - Display 4-letter room code (large, easy to read)
  - Player list with nicknames
  - Room config settings (submission mode, timer)
  - Start Game button (host only)

- **GameView** (`GameView.tsx`)
  - Turn indicator ("Your turn" / "Waiting for [Name]")
  - Timer countdown (if enabled)
  - Item submission input (on your turn)
  - Random Roll buttons (Browse / YOLO)
  - RankingList component embedded

- **RankingList** (`RankingList.tsx`)
  - 10 slots (1-10)
  - Each filled slot shows: emoji + text
  - Empty slots show number only
  - Click to assign current item to slot
  - Slots lock after assignment (visual indicator)

- **RevealScreen** (`RevealScreen.tsx`)
  - Your ranking list (full screen, polished)
  - Screenshot button
  - Carousel to view other players' lists
  - Play Again / Exit buttons

- **RandomRollModal** (`RandomRollModal.tsx`)
  - Display current random item
  - "Next" button (cycle to another)
  - "Use This" button (confirm selection)
  - "YOLO" button (instant submit without preview)

**shadcn/ui Components Used:**
- Button, Input, Card, Dialog/Modal
- Custom theme for black/white aesthetic

### 5.3 State Management

**Real-time state:**
- WebSocket connection manages room state
- Server is source of truth
- Client optimistically updates UI, server confirms

**Local state:**
- Player's own rankings (synced to server)
- UI state (modals, animations)
- Reconnection tokens

### 5.4 Security Considerations

**Low-stakes security (private rooms, no sensitive data):**
- Room codes are unguessable (4 random letters = 456,976 combinations)
- No authentication required (trust-based)
- Rate limiting on room creation to prevent spam
- Character limit prevents payload attacks
- No XSS risk (text is sanitized/escaped)

**API Security:**
- Anthropic API key stored server-side only
- Usage cap prevents runaway costs
- WebSocket connections validated per room

---

## 6. Questions & Decisions

### Open Questions

**Design Details (for implementation):**
1. Exact layout/positioning for mobile vs desktop
2. Carousel interaction pattern for reveal screen (swipe? buttons? both?)
3. Visual indicator for locked ranking slots
4. Loading states and error messages copy
5. Screenshot feature implementation (html2canvas? native browser API?)

**Technical Implementation:**
1. Durable Object state persistence strategy
2. WebSocket reconnection logic details
3. Rate limiting specifics (rooms/hour, API calls/day)
4. Error handling and fallback strategies
5. How to handle emoji API failures (random fallback list?)

**Nice-to-Haves (v1.5):**
1. Sound effects on interactions (optional toggle)
2. Haptic feedback on mobile
3. Room settings customization after creation
4. "Spectator" mode for late joiners

### Decision Log

**2025-12-18 - Tech Stack:**
- ✅ Frontend: React 18+ with Vite
- ✅ UI Library: shadcn/ui with Tailwind CSS
- ✅ Backend: Node.js on Cloudflare Workers
- ✅ Real-time: Cloudflare Durable Objects for WebSocket rooms
- ✅ Database: Cloudflare D1 (item pool) + KV (room cache)
- ✅ Monorepo: Turborepo or npm workspaces with pnpm
- ✅ Deployment: Cloudflare free tier (Pages + Workers)
- ✅ Shared types: TypeScript across monorepo

**2025-12-18 - Design:**
- ✅ Fonts: System fonts only (no custom fonts)
- ✅ Animations: None for v1 (Framer Motion planned for v2)
- ✅ Theme: White background, black lines/text, emoji accents only

**2025-12-18 - Features:**
- ✅ Emoji assignment: Use Haiku API (cheap, fast) with future local LLM exploration
- ✅ Character limit: 100 chars (server-configurable via .env)
- ✅ Room TTL: 10 minutes after last player leaves
- ✅ Round timer default: 60 seconds (adjustable/disableable)
- ✅ Room codes: 4-letter format
- ✅ Minimum players: 2 to start a game
- ✅ Timer expiration: Auto-skip turn, move to next player
- ✅ Daily challenge: Moved to v2 (not in initial build)

---

## 7. Out of Scope

### Explicitly NOT in v1

**Deferred to v2:**
- Daily Challenge game mode
- Animations (Framer Motion integration)
- Custom theming beyond black/white
- Sound effects and haptic feedback
- Spectator mode
- Game history or replay

**Not Planned (Any Version):**
- User accounts / login / profiles
- Persistent player stats or leaderboards
- Competitive rankings or scoring
- In-app chat (game is designed for voice conversation)
- Video/voice integration
- Paid features or monetization
- Mobile native apps (web-only)
- Custom room names (codes are sufficient)
- AI-generated content (beyond emoji assignment)
- Complex admin panel or CMS
- Content moderation tools (trust-based, private rooms)
- Multiple languages (English only)
- Advanced accessibility features (basic web standards only for v1)

### v1 Scope - Keep It Simple

**Primary Goal:** Build the core game loop perfectly
- Create room → Join → Configure → Play → Rank → Reveal → Screenshot
- Real-time sync with zero friction
- Mobile-first, minimal design
- Fast, reliable, fun

**Success Criteria:**
- 2-8 players can play a full game in under 10 minutes
- Zero setup friction (no accounts, no downloads)
- Works flawlessly on phones in-person
- Shareable screenshots that make people want to play
