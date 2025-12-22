import chalk from 'chalk';
import ora from 'ora';
import type { Room, SubmissionMode } from '@rank-everything/shared-types';

interface CreateOptions {
  players?: string;
  mode?: string;
  timer?: string;
  started?: boolean;
  json?: boolean;
}

interface SimulateOptions {
  players?: string;
  speed?: 'fast' | 'realtime';
  output?: string;
}

interface StateOptions {
  watch?: boolean;
  json?: boolean;
}

// Generate a random 4-letter room code
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Excluding I and O to avoid confusion
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Generate a random player ID
function generatePlayerId(): string {
  return `player_${Math.random().toString(36).substring(2, 10)}`;
}

export const roomCommands = {
  async create(options: CreateOptions): Promise<void> {
    if (!options.json) {
      console.log(chalk.bold('\n🎲 Creating Test Room\n'));
    }

    const playerCount = parseInt(options.players || '4', 10);
    const timerDuration = parseInt(options.timer || '60', 10);
    const submissionMode = (options.mode as SubmissionMode) || 'round-robin';

    const roomCode = generateRoomCode();
    const hostPlayerId = generatePlayerId();

    // Generate bot players
    const botNames = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry'];
    const players = [
      {
        id: hostPlayerId,
        nickname: 'Host',
        roomId: roomCode,
        connected: true,
        rankings: {},
        joinedAt: Date.now(),
      },
      ...Array.from({ length: playerCount - 1 }, (_, i) => ({
        id: generatePlayerId(),
        nickname: botNames[i % botNames.length],
        roomId: roomCode,
        connected: true,
        rankings: {},
        joinedAt: Date.now() + i + 1,
      })),
    ];

    const room: Room = {
      id: roomCode,
      hostPlayerId,
      config: {
        submissionMode,
        timerEnabled: timerDuration > 0,
        timerDuration,
        itemsPerGame: 10,
        rankingTimeout: 30, // Default 30s
      },
      status: options.started ? 'in-progress' : 'lobby',
      players,
      items: [],
      currentTurnPlayerId: options.started ? players[0].id : null,
      currentTurnIndex: 0,
      timerEndAt: null,
      rankingTimerEndAt: null,
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
    };

    if (options.json) {
      console.log(
        JSON.stringify(
          {
            roomCode,
            hostPlayerId,
            players: room.players,
            config: room.config,
            status: room.status,
            wsUrl: `ws://localhost:1999/party/${roomCode}`,
          },
          null,
          2
        )
      );
      return;
    }

    console.log(chalk.green(`Room Code: ${chalk.bold(roomCode)}`));
    console.log('');
    console.log('Configuration:');
    console.log(`  Mode: ${submissionMode}`);
    console.log(`  Timer: ${timerDuration > 0 ? `${timerDuration}s` : 'disabled'}`);
    console.log(`  Players: ${playerCount}`);
    console.log('');
    console.log('Players:');
    room.players.forEach((p, i) => {
      const host = p.id === hostPlayerId ? chalk.yellow(' (host)') : '';
      console.log(`  ${i + 1}. ${p.nickname}${host}`);
    });
    console.log('');
    console.log(chalk.cyan(`WebSocket: ws://localhost:1999/party/${roomCode}`));
    console.log('');

    if (!options.started) {
      console.log(chalk.dim('Room is in lobby. Use --started to begin game immediately.\n'));
    } else {
      console.log(chalk.dim(`Game started. ${players[0].nickname}'s turn.\n`));
    }

    console.log(
      chalk.yellow('Note: This creates a mock room. Real rooms require the API server.\n')
    );
  },

  async simulate(options: SimulateOptions): Promise<void> {
    console.log(chalk.bold('\n🎮 Simulating Game Session\n'));

    const playerCount = parseInt(options.players || '4', 10);
    const speed = options.speed || 'fast';

    console.log(chalk.cyan(`Simulating ${playerCount}-player game (${speed} mode)`));
    console.log('');

    const spinner = ora('Initializing simulation...').start();

    // Import the simulator locally to avoid load issues if it fails
    const { runFullGame } = await import('../lib/GameSimulator.js');

    const result = runFullGame(playerCount);

    if (result.errors.length > 0) {
      spinner.fail(`Simulation failed with ${result.errors.length} errors`);
      result.errors.forEach((e) => console.error(chalk.red(`  - ${e}`)));
      return;
    }

    spinner.succeed(`Simulation complete (${result.duration}ms)`);
    console.log('');

    // Process events for display
    console.log('Game Timeline:');
    console.log(chalk.dim('─'.repeat(40)));

    const maxEvents = 20;
    const eventsToShow = result.events.slice(0, maxEvents);

    eventsToShow.forEach((event) => {
      const time = new Date(event.timestamp).toISOString().split('T')[1].split('.')[0];
      let msg = '';

      switch (event.type) {
        case 'room_created':
          msg = 'Room created';
          break;
        case 'player_joined':
          msg = `Player joined: ${(event.data as { nickname: string }).nickname}`;
          break;
        case 'game_started':
          msg = 'Game started';
          break;
        case 'item_submitted':
          msg = `Item submitted: "${(event.data as { text: string }).text}"`;
          break;
        case 'turn_changed':
          msg = `Turn changed to Player`;
          break;
        case 'game_ended':
          msg = 'Game ended';
          break;
        default:
          msg = event.type;
      }

      console.log(`[${chalk.dim(time)}] ${msg}`);
    });

    if (result.events.length > maxEvents) {
      console.log(chalk.dim(`... and ${result.events.length - maxEvents} more events`));
    }

    console.log('');
    console.log('Final Standings:');
    console.log(chalk.dim('─'.repeat(40)));

    result.room.players.forEach((p) => {
      console.log(chalk.bold(`\n${p.nickname}:`));
      // Sort items by ranking
      const submittedItems = result.room.items;
      Object.entries(p.rankings)
        .sort(([, a], [, b]) => a - b)
        .forEach(([itemId, rank]) => {
          const item = submittedItems.find((i) => i.id === itemId);
          if (item) console.log(`  ${rank}. ${item.text}`);
        });
    });

    if (options.output) {
      // Save full result to file
      const fs = await import('fs');
      fs.writeFileSync(options.output, JSON.stringify(result, null, 2));
      console.log(chalk.dim(`\nGame log saved to: ${options.output}`));
    }

    console.log('');
  },

  async state(code: string, options: StateOptions): Promise<void> {
    if (!options.json) {
      console.log(chalk.bold(`\n🔍 Room State: ${code}\n`));
    }

    // Mock room state (would fetch from API in real implementation)
    const mockState = {
      id: code,
      status: 'in-progress',
      players: [
        { nickname: 'Alice', connected: true },
        { nickname: 'Bob', connected: true },
        { nickname: 'Charlie', connected: false },
      ],
      itemCount: 5,
      currentTurn: 'Bob',
      timerRemaining: 45,
    };

    if (options.json) {
      console.log(JSON.stringify(mockState, null, 2));
      return;
    }

    console.log(`Status: ${chalk.cyan(mockState.status)}`);
    console.log(`Items: ${mockState.itemCount}/10`);
    console.log(`Current Turn: ${mockState.currentTurn}`);
    console.log(`Timer: ${mockState.timerRemaining}s`);
    console.log('');
    console.log('Players:');
    mockState.players.forEach((p, _i) => {
      const status = p.connected ? chalk.green('●') : chalk.red('○');
      console.log(`  ${status} ${p.nickname}`);
    });
    console.log('');

    if (options.watch) {
      console.log(chalk.dim('Watching for changes... (Ctrl+C to exit)\n'));
      console.log(chalk.yellow('Watch mode requires WebSocket connection to API\n'));
    }
  },
};
