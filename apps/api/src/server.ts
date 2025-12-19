import type * as Party from 'partykit/server';
import type {
  Room,
  Player,
  Item,
  RoomConfig,
  ClientEvent,
  ServerEvent,
} from '@rank-everything/shared-types';

// Room state stored in Durable Object
interface RoomState {
  room: Room | null;
  connections: Map<string, string>; // connectionId -> playerId
}

// Generate unique IDs
function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

// Fetch emoji from worker API
async function fetchEmoji(text: string, apiUrl: string): Promise<string> {
  try {
    const response = await fetch(`${apiUrl}/api/emoji`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (response.ok) {
      const data = await response.json() as { emoji: string };
      return data.emoji || '🎲';
    }
  } catch (error) {
    console.error('Failed to fetch emoji:', error);
  }

  // Fallback emojis
  const fallbacks = ['🎲', '✨', '🌟', '💫', '🎯', '🎪', '🎭', '🎨'];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

// Save item to global pool via worker API
async function saveToGlobalPool(text: string, emoji: string, apiUrl: string): Promise<void> {
  try {
    await fetch(`${apiUrl}/api/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, emoji }),
    });
  } catch (error) {
    console.error('Failed to save to global pool:', error);
  }
}

// PartyKit server for game rooms
export default class GameRoom implements Party.Server {
  state: RoomState = {
    room: null,
    connections: new Map(),
  };

  // API URL for worker (set via partykit.json or env)
  private apiUrl = 'http://localhost:8787';

  constructor(readonly room: Party.Room) {
    // Use production URL if not local
    if (room.env?.WORKER_URL) {
      this.apiUrl = room.env.WORKER_URL as string;
    }
  }

  // Called when the party is created
  async onStart() {
    // Initialize room state from storage if it exists
    const stored = await this.room.storage.get<Room>('room');
    if (stored) {
      this.state.room = stored;
    }
  }

  // Handle HTTP requests (REST API)
  async onRequest(req: Party.Request): Promise<Response> {
    const url = new URL(req.url);

    // GET /party/:roomId - Get room state
    if (req.method === 'GET') {
      if (!this.state.room) {
        return new Response(JSON.stringify({ error: 'Room not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ room: this.state.room }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // POST /party/:roomId - Create/join room
    if (req.method === 'POST') {
      try {
        const body = await req.json() as { action: string; nickname?: string; config?: Partial<RoomConfig> };

        if (body.action === 'create') {
          return this.handleCreateRoom(body.nickname || 'Host', body.config);
        }

        if (body.action === 'join') {
          return this.handleJoinRoom(body.nickname || 'Player');
        }

        if (body.action === 'start') {
          return this.handleStartGame();
        }

        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: 'Invalid request' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response('Method not allowed', { status: 405 });
  }

  // Create a new room
  private async handleCreateRoom(nickname: string, config?: Partial<RoomConfig>): Promise<Response> {
    if (this.state.room) {
      return new Response(JSON.stringify({ error: 'Room already exists' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const hostPlayerId = generateId();
    const now = Date.now();

    const room: Room = {
      id: this.room.id,
      hostPlayerId,
      config: {
        submissionMode: config?.submissionMode || 'round-robin',
        timerEnabled: config?.timerEnabled ?? true,
        timerDuration: config?.timerDuration || 60,
      },
      status: 'lobby',
      players: [{
        id: hostPlayerId,
        nickname,
        roomId: this.room.id,
        connected: true,
        rankings: {},
        joinedAt: now,
      }],
      items: [],
      currentTurnPlayerId: null,
      currentTurnIndex: 0,
      timerEndAt: null,
      createdAt: now,
      lastActivityAt: now,
    };

    this.state.room = room;
    await this.room.storage.put('room', room);

    return new Response(JSON.stringify({
      roomCode: this.room.id,
      playerId: hostPlayerId,
      room,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Join an existing room
  private async handleJoinRoom(nickname: string): Promise<Response> {
    if (!this.state.room) {
      return new Response(JSON.stringify({ error: 'Room not found', code: 'ROOM_NOT_FOUND' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (this.state.room.status !== 'lobby') {
      return new Response(JSON.stringify({ error: 'Game already started', code: 'GAME_ALREADY_STARTED' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const playerId = generateId();
    const now = Date.now();

    const player: Player = {
      id: playerId,
      nickname,
      roomId: this.room.id,
      connected: true,
      rankings: {},
      joinedAt: now,
    };

    this.state.room.players.push(player);
    this.state.room.lastActivityAt = now;
    await this.room.storage.put('room', this.state.room);

    // Broadcast to all connections
    this.broadcast({ type: 'player_joined', player });

    return new Response(JSON.stringify({
      playerId,
      room: this.state.room,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Start the game
  private async handleStartGame(): Promise<Response> {
    if (!this.state.room) {
      return new Response(JSON.stringify({ error: 'Room not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (this.state.room.status !== 'lobby') {
      return new Response(JSON.stringify({ error: 'Game already started' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (this.state.room.players.length < 2) {
      return new Response(JSON.stringify({ error: 'Not enough players', code: 'NOT_ENOUGH_PLAYERS' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    this.state.room.status = 'in-progress';
    this.state.room.currentTurnIndex = 0;
    this.state.room.currentTurnPlayerId = this.state.room.players[0].id;

    if (this.state.room.config.timerEnabled) {
      this.state.room.timerEndAt = Date.now() + (this.state.room.config.timerDuration * 1000);
    }

    await this.room.storage.put('room', this.state.room);

    this.broadcast({ type: 'game_started' });
    this.broadcast({
      type: 'turn_changed',
      playerId: this.state.room.currentTurnPlayerId,
      timerEndAt: this.state.room.timerEndAt,
    });

    return new Response(JSON.stringify({ room: this.state.room }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Handle WebSocket connections
  async onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    console.log(`Connection: ${conn.id}`);

    // Send current room state on connect
    if (this.state.room) {
      conn.send(JSON.stringify({ type: 'room_updated', room: this.state.room }));
    }
  }

  // Handle incoming WebSocket messages
  async onMessage(message: string, sender: Party.Connection) {
    try {
      const event = JSON.parse(message) as ClientEvent;

      switch (event.type) {
        case 'submit_item':
          await this.handleSubmitItem(event.text, sender);
          break;
        case 'rank_item':
          await this.handleRankItem(event.itemId, event.ranking, sender);
          break;
        case 'skip_turn':
          await this.handleSkipTurn(sender);
          break;
        case 'reconnect':
          await this.handleReconnect(event.playerId, sender);
          break;
        default:
          sender.send(JSON.stringify({ type: 'error', message: 'Unknown event type' }));
      }
    } catch (error) {
      sender.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  }

  // Handle item submission
  private async handleSubmitItem(text: string, sender: Party.Connection) {
    if (!this.state.room || this.state.room.status !== 'in-progress') {
      sender.send(JSON.stringify({ type: 'error', message: 'Game not in progress' }));
      return;
    }

    const trimmedText = text.trim().substring(0, 100); // Enforce max length

    // Check for duplicates
    if (this.state.room.items.some(item => item.text.toLowerCase() === trimmedText.toLowerCase())) {
      sender.send(JSON.stringify({ type: 'error', message: 'Duplicate item', code: 'DUPLICATE_ITEM' }));
      return;
    }

    // Fetch emoji from API (non-blocking for speed, falls back to default)
    const emoji = await fetchEmoji(trimmedText, this.apiUrl);

    // Create new item
    const item: Item = {
      id: generateId(),
      text: trimmedText,
      emoji,
      submittedByPlayerId: this.state.connections.get(sender.id) || 'unknown',
      submittedAt: Date.now(),
      roomId: this.room.id,
    };

    this.state.room.items.push(item);
    this.state.room.lastActivityAt = Date.now();

    // Move to next turn
    this.advanceTurn();

    await this.room.storage.put('room', this.state.room);

    // Broadcast to all
    this.broadcast({ type: 'item_submitted', item });
    this.broadcast({ type: 'room_updated', room: this.state.room });

    // Save to global pool in background (for random roll feature)
    saveToGlobalPool(trimmedText, emoji, this.apiUrl).catch(() => {});

    // Check if game is complete
    if (this.state.room.items.length >= 10) {
      this.state.room.status = 'ended';
      await this.room.storage.put('room', this.state.room);
      this.broadcast({ type: 'game_ended' });
    }
  }

  // Handle ranking
  private async handleRankItem(itemId: string, ranking: number, sender: Party.Connection) {
    if (!this.state.room) {
      sender.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
      return;
    }

    if (ranking < 1 || ranking > 10) {
      sender.send(JSON.stringify({ type: 'error', message: 'Invalid ranking', code: 'INVALID_RANKING' }));
      return;
    }

    const playerId = this.state.connections.get(sender.id);
    if (!playerId) {
      sender.send(JSON.stringify({ type: 'error', message: 'Player not found' }));
      return;
    }

    const player = this.state.room.players.find(p => p.id === playerId);
    if (!player) {
      sender.send(JSON.stringify({ type: 'error', message: 'Player not in room' }));
      return;
    }

    // Check if slot is already taken
    if (Object.values(player.rankings).includes(ranking)) {
      sender.send(JSON.stringify({ type: 'error', message: 'Ranking slot already taken', code: 'RANKING_SLOT_TAKEN' }));
      return;
    }

    player.rankings[itemId] = ranking;
    this.state.room.lastActivityAt = Date.now();

    await this.room.storage.put('room', this.state.room);

    // Notify just this player
    sender.send(JSON.stringify({ type: 'room_updated', room: this.state.room }));
  }

  // Handle turn skip
  private async handleSkipTurn(sender: Party.Connection) {
    if (!this.state.room || this.state.room.status !== 'in-progress') {
      return;
    }

    this.advanceTurn();
    await this.room.storage.put('room', this.state.room);

    this.broadcast({
      type: 'turn_changed',
      playerId: this.state.room.currentTurnPlayerId!,
      timerEndAt: this.state.room.timerEndAt,
    });
  }

  // Handle reconnection
  private async handleReconnect(playerId: string, sender: Party.Connection) {
    if (!this.state.room) {
      sender.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
      return;
    }

    const player = this.state.room.players.find(p => p.id === playerId);
    if (!player) {
      sender.send(JSON.stringify({ type: 'error', message: 'Player not found' }));
      return;
    }

    // Update connection mapping
    this.state.connections.set(sender.id, playerId);
    player.connected = true;

    await this.room.storage.put('room', this.state.room);

    sender.send(JSON.stringify({ type: 'room_updated', room: this.state.room }));
    this.broadcast({ type: 'player_reconnected', playerId });
  }

  // Advance to next turn
  private advanceTurn() {
    if (!this.state.room) return;

    this.state.room.currentTurnIndex =
      (this.state.room.currentTurnIndex + 1) % this.state.room.players.length;
    this.state.room.currentTurnPlayerId =
      this.state.room.players[this.state.room.currentTurnIndex].id;

    if (this.state.room.config.timerEnabled) {
      this.state.room.timerEndAt = Date.now() + (this.state.room.config.timerDuration * 1000);
    }
  }

  // Handle disconnection
  async onClose(conn: Party.Connection) {
    const playerId = this.state.connections.get(conn.id);
    if (playerId && this.state.room) {
      const player = this.state.room.players.find(p => p.id === playerId);
      if (player) {
        player.connected = false;
        await this.room.storage.put('room', this.state.room);
        this.broadcast({ type: 'player_left', playerId });
      }
    }
    this.state.connections.delete(conn.id);
  }

  // Broadcast to all connections
  private broadcast(event: ServerEvent) {
    this.room.broadcast(JSON.stringify(event));
  }
}
