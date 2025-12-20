/**
 * Shared UI copy/text strings
 *
 * Use these constants in components AND tests to prevent selector mismatches.
 * When you change a button label here, both UI and tests update automatically.
 */

export const COPY = {
  // Homepage
  appTitle: 'Rank Everything',
  appTagline: 'Pick a number!',

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
    shareQR: 'Share QR Code',
    close: 'Close',
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
    scanToJoin: 'Scan to join room',
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
    itemCount: 'items',
    remaining: 'remaining',
  },

  // Reveal Screen
  reveal: {
    playAgain: 'Play Again',
    exit: 'Exit',
    gameOver: 'Game Over!',
    viewRankings: 'View Rankings',
  },

  // Settings (editable in lobby)
  settings: {
    timerEnabled: 'Turn Timer',
    timerDuration: 'Timer Duration',
    submissionMode: 'Submission Mode',
    roundRobin: 'Round Robin',
    hostOnly: 'Host Only',
    seconds: 'seconds',
  },
} as const;

// Type helper for test selectors
export type CopyKeys = typeof COPY;
