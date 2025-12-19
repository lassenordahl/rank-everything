/**
 * Shared UI copy/text strings
 *
 * Use these constants in components AND tests to prevent selector mismatches.
 * When you change a button label here, both UI and tests update automatically.
 */

export const COPY = {
  // Homepage
  appTitle: 'Rank Everything',
  appTagline: 'The ultimate party game for opinions.',

  // Buttons
  buttons: {
    createRoom: 'Create Room',
    joinRoom: 'Join Room',
    create: 'Create',
    join: 'Join',
    back: 'Back',
    startGame: 'Start Game',
    copyLink: 'Copy Link',
    copiedLink: 'Copied Link!',
  },

  // Form placeholders
  placeholders: {
    nickname: 'Your nickname',
    roomCode: 'Room code (e.g., ABCD)',
  },

  // Loading/pending states
  pending: {
    creating: 'Creating...',
    joining: 'Joining...',
    starting: 'Starting...',
    loading: 'Loading room...',
  },

  // Labels
  labels: {
    roomCode: 'Room Code',
    joinRoomTitle: 'Join Room',
    createRoomTitle: 'Create Room',
    settings: 'Settings',
    players: 'Players',
    host: '(host)',
    mode: 'Mode:',
    timer: 'Timer:',
    timerOff: 'Off',
    waitingForHost: 'Waiting for host to start...',
    needPlayers: 'Need 1+ Players',
    enterNickname: 'Enter your nickname to join',
  },

  // Errors
  errors: {
    connectionLost: 'Connection lost! Redirected to home.',
  },

  // Game View
  game: {
    yourTurn: 'Your turn!',
    waitingFor: 'Waiting for', // followed by player name
    enterItem: 'Enter something to rank...',
    submit: 'Submit',
    chooseSlot: 'Choose a slot (1 = best, 10 = worst):',
    myRankings: 'My Rankings',
    itemCount: '/ 10 items',
    remaining: 'remaining',
  },
} as const;

// Type helper for test selectors
export type CopyKeys = typeof COPY;
