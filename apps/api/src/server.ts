import type * as Party from 'partykit/server';
import type {
  Room,
  Player,
  Item,
  RoomConfig,
  ClientEvent,
  ServerEvent,
} from '@rank-everything/shared-types';
import { GameRoomState, RoomState } from './state/GameRoomState';
import { handleCreateRoom } from './handlers/http/createRoom';
import { handleJoinRoom } from './handlers/http/joinRoom';
import { handleStartGame } from './handlers/http/startGame';
import { handleSubmitItem } from './handlers/ws/submitItem';
import { handleRankItem } from './handlers/ws/rankItem';
import { handleSkipTurn } from './handlers/ws/skipTurn';
import {
  createRoomSchema,
  joinRoomSchema,
  submitItemSchema,
  rankItemSchema
} from '@rank-everything/validation';

// Generate unique IDs
function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export default class GameRoom implements Party.Server {
  // Use the extracted state manager
  private gameState: GameRoomState;
  private apiUrl = 'http://localhost:8787'; // Worker URL

  constructor(readonly room: Party.Room) {
    this.gameState = new GameRoomState({
      room: null,
      connections: new Map(),
    });
    // Use production URL if not local
    if (room.env?.WORKER_URL) {
      this.apiUrl = room.env.WORKER_URL as string;
    }
  }

  async onStart() {
    // Load state from storage
    const storedRoom = await this.room.storage.get<Room>('room');
    if (storedRoom) {
      this.gameState.state.room = storedRoom;
    }
  }

  // Handle HTTP requests (REST API)
  async onRequest(req: Party.Request): Promise<Response> {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(req.url);

    // GET /party/:roomId - Get room state
    if (req.method === 'GET') {
      if (!this.gameState.room) {
        return new Response(JSON.stringify({ error: 'Room not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      return new Response(JSON.stringify({ room: this.gameState.room }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (req.method === 'POST') {
      try {
        // Clean URL to handle trailing slashes roughly
        if (url.pathname.endsWith(this.room.id) || url.pathname.endsWith(this.room.id + '/')) {
          const body = await req.clone().json() as { action: string };

          if (body.action === 'create') {
            const response = await handleCreateRoom(
              req,
              this.room.id,
              this.gameState,
              corsHeaders
            );
            // Persist state
            if (response.ok && this.gameState.room) {
                await this.room.storage.put('room', this.gameState.room);
            }
            return response;
          }

          if (body.action === 'join') {
            const response = await handleJoinRoom(
              req,
              this.gameState,
              (event) => this.broadcast(event),
              corsHeaders
            );
            // Persist state (player added)
            // Ideally we optimize persistence but correct > fast for now
            if (response.ok && this.gameState.room) {
               await this.room.storage.put('room', this.gameState.room);
            }
            return response;
          }

          if (body.action === 'start') {
            const response = await handleStartGame(
              req,
              this.gameState,
              (event) => this.broadcast(event),
              corsHeaders
            );
             // Persist state (status changed)
            if (response.ok && this.gameState.room) {
               await this.room.storage.put('room', this.gameState.room);
            }
            return response;
          }
        }
      } catch (e) {
        console.error('Error handling request:', e);
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    }

    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  // Handle WebSocket connections
  async onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    // Recover player ID from query param or previous session?
    // Current implementation relies on client knowing their ID via localStorage and API response,
    // but the websocket doesn't automatically authenticate.
    // The previous implementation mapped connection ID to player ID only after messages?
    // Actually, looking at original code, handleReconnect logic was used.

    // We'll trust the client to send a reconnect message or we can parse URL params if we added them.
    // For now we just wait for messages.

    console.log(`Connection: ${conn.id}`);

    // Send current room state on connect
    if (this.gameState.room) {
      conn.send(JSON.stringify({ type: 'room_updated', room: this.gameState.room }));
    }
  }

  async onMessage(message: string, sender: Party.Connection) {
    try {
      const data = JSON.parse(message) as ClientEvent;

      switch (data.type) {
        case 'submit_item':
          await handleSubmitItem(
            data,
            sender,
            this.gameState,
            (e) => this.broadcast(e),
            this.saveToGlobalPool.bind(this),
            this.fetchEmoji.bind(this)
          );
          if (this.gameState.room) await this.room.storage.put('room', this.gameState.room);
          break;

        case 'rank_item':
          await handleRankItem(data, sender, this.gameState, (e) => this.broadcast(e));
          if (this.gameState.room) await this.room.storage.put('room', this.gameState.room);
          break;

        case 'skip_turn':
          const turnChanged = handleSkipTurn(sender, this.gameState, (e) => this.broadcast(e));
          if (turnChanged) {
             const result = this.gameState.advanceTurn();
             if (result) {
                 this.broadcast({
                     type: 'turn_changed',
                     playerId: result.nextTurnPlayerId,
                     timerEndAt: this.gameState.room?.timerEndAt || null
                 });
             }
             if (this.gameState.room) await this.room.storage.put('room', this.gameState.room);
          }
          break;

        case 'reconnect':
          await this.handleReconnect(data.playerId, sender);
          break;
        default:
          sender.send(JSON.stringify({ type: 'error', message: 'Unknown event type' }));
      }
    } catch (e) {
      console.error('Error handling message:', e);
      sender.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  }

  // Helper methods that depend on Worker bindings or Room scope

  async fetchEmoji(text: string): Promise<string> {
    try {
      const response = await fetch(`${this.apiUrl}/api/emoji`, {
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

  async saveToGlobalPool(text: string, emoji: string): Promise<void> {
    try {
      await fetch(`${this.apiUrl}/api/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, emoji }),
      });
    } catch (error) {
      console.error('Failed to save to global pool:', error);
    }
  }

  async handleReconnect(playerId: string, sender: Party.Connection) {
    const player = this.gameState.getPlayer(playerId);

    if (player) {
      // Update connection mapping
      this.gameState.connections.set(sender.id, playerId);
      this.gameState.updatePlayerConnection(playerId, true);

      // Send current room state to reconnecting player
      sender.send(JSON.stringify({
        type: 'room_updated',
        room: this.gameState.room,
      }));

      // Notify others
      this.broadcast({ type: 'player_reconnected', playerId });
      if (this.gameState.room) await this.room.storage.put('room', this.gameState.room);
    } else {
      sender.send(JSON.stringify({ type: 'error', message: 'Player not found', code: 'PLAYER_NOT_FOUND' }));
    }
  }

  async onClose(conn: Party.Connection) {
    const playerId = this.gameState.connections.get(conn.id);
    if (playerId) {
      // If game hasn't started, remove the player completely
      if (this.gameState.room?.status === 'lobby') {
        this.gameState.removePlayer(playerId);
        this.gameState.connections.delete(conn.id);

        // Broadcast updated room state implies removal if player list changes
        // But broadcast event 'player_left' is usually just a notification
        // We should send 'room_updated' to ensure clients sync the list removal
        // Or 'player_left' allows clients to remove?
        // Let's send room_updated to be safe, as player_left might be interpreted as "mark disconnected"
        this.broadcast({ type: 'room_updated', room: this.gameState.room! });
      } else {
        // Game started, just mark as disconnected
        this.gameState.updatePlayerConnection(playerId, false);
        this.broadcast({ type: 'player_left', playerId });
      }

      // Cleanup connection map if just marking disconnected? No, we need it for reconnect.
      // But if removed, we deleted it above.

      if (!this.gameState.connections.has(conn.id)) {
          // Already deleted (lobby case)
      } else {
          // Keep mapping for reconnect (game case)
          this.gameState.connections.delete(conn.id);
          // WAIT! If we delete the mapping, how do we know who they were when they reconnect?
          // Reconnect logic relies on client sending "I was player X", and server validating?
          // handleReconnect(playerId, sender) trusts the playerId sent by client?
          // handleReconnect logic: `const player = this.gameState.getPlayer(playerId)` -> if exists, rebind.
          // So we DON'T need the old connection mapping. We just need the player entity to exist.
          // So deleting `conn.id` from `connections` is correct in ALL cases.
      }

      // Actually, looking at code: `this.gameState.connections.delete(conn.id);` was unconditional.
      // So yes, we delete the *socket connection ID* mapping.
      // The player entity remains in `state.room.players` (unless lobby removal).

      if (this.gameState.room) await this.room.storage.put('room', this.gameState.room);
    }
  }

  broadcast(event: ServerEvent) {
    this.room.broadcast(JSON.stringify(event));
  }
}
