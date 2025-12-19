import type * as Party from 'partykit/server';
import type { Room, ClientEvent, ServerEvent } from '@rank-everything/shared-types';
import { GameRoomState } from './state/GameRoomState';
import { handleCreateRoom } from './handlers/http/createRoom';
import { handleJoinRoom } from './handlers/http/joinRoom';
import { handleStartGame } from './handlers/http/startGame';
import { handleSubmitItem } from './handlers/ws/submitItem';
import { handleRankItem } from './handlers/ws/rankItem';
import { handleSkipTurn } from './handlers/ws/skipTurn';
import { handleResetRoom } from './handlers/ws/resetRoom';
import { handleUpdateConfig } from './handlers/ws/updateConfig';

// Grace period before removing disconnected players (60 seconds)
const DISCONNECT_GRACE_PERIOD_MS = 60 * 1000;

export default class GameRoom implements Party.Server {
  // Use the extracted state manager
  private gameState: GameRoomState;
  private apiUrl = 'http://localhost:8787'; // Worker URL
  // Track pending disconnect timeouts for grace period
  private disconnectTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();

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

    // If there's an active ranking timer, set the alarm
    if (storedRoom?.rankingTimerEndAt && storedRoom.rankingTimerEndAt > Date.now()) {
      await this.room.storage.setAlarm(storedRoom.rankingTimerEndAt);
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
          const body = (await req.clone().json()) as { action: string };

          if (body.action === 'create') {
            const response = await handleCreateRoom(req, this.room.id, this.gameState, corsHeaders);
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
              // Set turn timer alarm if timer is enabled
              if (this.gameState.room.timerEndAt) {
                await this.room.storage.setAlarm(this.gameState.room.timerEndAt);
              }
            }
            return response;
          }
        }
      } catch (e) {
        console.error('Error handling request:', e);
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
    }

    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  // Handle WebSocket connections
  async onConnect(conn: Party.Connection, _ctx: Party.ConnectionContext) {
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
          // Check if game should end (itemsPerGame reached)
          if (
            this.gameState.room &&
            this.gameState.room.items.length >= this.gameState.room.config.itemsPerGame
          ) {
            this.gameState.endGame();
            this.broadcast({ type: 'game_ended' });
          } else if (this.gameState.room?.config.submissionMode === 'round-robin') {
            // Advance turn after item submission in round-robin mode
            const result = this.gameState.advanceTurn();
            if (result) {
              this.broadcast({
                type: 'turn_changed',
                playerId: result.nextTurnPlayerId,
                timerEndAt: this.gameState.room?.timerEndAt || null,
              });
              // Set alarm for next turn timer
              if (this.gameState.room?.timerEndAt) {
                await this.room.storage.setAlarm(this.gameState.room.timerEndAt);
              }
            }
          }

          // Start ranking timer for the new item (if game hasn't ended)
          if (this.gameState.room && this.gameState.room.status === 'in-progress') {
            this.gameState.startRankingTimer();
            // Set alarm for when ranking timer expires
            if (this.gameState.room.rankingTimerEndAt) {
              await this.room.storage.setAlarm(this.gameState.room.rankingTimerEndAt);
            }
          }

          // Also broadcast room_updated so clients get full state (items list)
          // This ensures clients don't miss item_submitted due to message race conditions
          if (this.gameState.room) {
            this.broadcast({ type: 'room_updated', room: this.gameState.room });
            await this.room.storage.put('room', this.gameState.room);
          }
          break;

        case 'rank_item':
          await handleRankItem(data, sender, this.gameState, (e) => this.broadcast(e));
          if (this.gameState.room) await this.room.storage.put('room', this.gameState.room);
          break;

        case 'skip_turn': {
          const turnChanged = handleSkipTurn(sender, this.gameState, (e) => this.broadcast(e));
          if (turnChanged) {
            const result = this.gameState.advanceTurn();
            if (result) {
              this.broadcast({
                type: 'turn_changed',
                playerId: result.nextTurnPlayerId,
                timerEndAt: this.gameState.room?.timerEndAt || null,
              });
              // Set alarm for next turn timer
              if (this.gameState.room?.timerEndAt) {
                await this.room.storage.setAlarm(this.gameState.room.timerEndAt);
              }
            }
            if (this.gameState.room) await this.room.storage.put('room', this.gameState.room);
          }
          break;
        }

        case 'reconnect':
          await this.handleReconnect(data.playerId, sender);
          break;

        case 'reset_room': {
          const resetSuccess = handleResetRoom(sender, this.gameState, (e) => this.broadcast(e));
          if (resetSuccess && this.gameState.room) {
            await this.room.storage.put('room', this.gameState.room);
          }
          break;
        }

        case 'update_config': {
          const configSuccess = handleUpdateConfig(
            sender,
            this.gameState,
            (e) => this.broadcast(e),
            data.config
          );
          if (configSuccess && this.gameState.room) {
            await this.room.storage.put('room', this.gameState.room);
          }
          break;
        }

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
        const data = (await response.json()) as { emoji: string };
        return data.emoji || '🎲';
      }
    } catch (error) {
      console.error('Failed to fetch emoji:', error);
    }

    // Fallback emojis
    const fallbacks = ['🎲', '✨', '🌟', '💫', '🎯', '🎪', '🎭', '🎨'];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)] ?? '🎲';
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
      // Cancel any pending disconnect timeout
      const pendingTimeout = this.disconnectTimeouts.get(playerId);
      if (pendingTimeout) {
        console.log(`Player ${playerId} reconnected. Canceling grace period timeout.`);
        clearTimeout(pendingTimeout);
        this.disconnectTimeouts.delete(playerId);
      }

      // Update connection mapping
      this.gameState.connections.set(sender.id, playerId);
      this.gameState.updatePlayerConnection(playerId, true);

      // Send current room state to reconnecting player
      sender.send(
        JSON.stringify({
          type: 'room_updated',
          room: this.gameState.room,
        })
      );

      // Notify others
      this.broadcast({ type: 'player_reconnected', playerId });
      if (this.gameState.room) await this.room.storage.put('room', this.gameState.room);
    } else {
      sender.send(
        JSON.stringify({ type: 'error', message: 'Player not found', code: 'PLAYER_NOT_FOUND' })
      );
    }
  }

  async onClose(conn: Party.Connection) {
    const playerId = this.gameState.connections.get(conn.id);
    if (playerId) {
      // Always mark player as disconnected first
      this.gameState.updatePlayerConnection(playerId, false);
      this.gameState.connections.delete(conn.id);

      // Notify others of disconnect
      this.broadcast({ type: 'player_left', playerId });

      // Immediately migrate host if the disconnected player was the host
      const hostMigrated = this.gameState.migrateHostIfNeeded(playerId);
      if (hostMigrated && this.gameState.room) {
        console.log(`Host migrated to: ${this.gameState.room.hostPlayerId}`);
        this.broadcast({ type: 'room_updated', room: this.gameState.room });
      }

      // If game hasn't started (lobby), schedule delayed removal with grace period
      // This allows users to switch apps (e.g., to send the room link) without losing the room
      if (this.gameState.room?.status === 'lobby') {
        console.log(
          `Player ${playerId} disconnected in lobby. Starting ${DISCONNECT_GRACE_PERIOD_MS / 1000}s grace period.`
        );

        // Cancel any existing timeout for this player
        const existingTimeout = this.disconnectTimeouts.get(playerId);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
        }

        // Schedule removal after grace period
        const timeout = setTimeout(async () => {
          // Check if player is still disconnected (they might have reconnected)
          const player = this.gameState.getPlayer(playerId);
          if (player && !player.connected) {
            console.log(`Grace period expired for ${playerId}. Removing from room.`);
            this.gameState.removePlayer(playerId);

            // Broadcast room update to reflect removal
            if (this.gameState.room) {
              this.broadcast({ type: 'room_updated', room: this.gameState.room });
            }

            // Check if room is now empty
            if (this.gameState.room && this.gameState.room.players.length === 0) {
              console.log(`Room ${this.room.id} empty after grace period. Deleting.`);
              this.gameState.reset();
              await this.room.storage.delete('room');
            } else if (this.gameState.room) {
              await this.room.storage.put('room', this.gameState.room);
            }
          }

          this.disconnectTimeouts.delete(playerId);
        }, DISCONNECT_GRACE_PERIOD_MS);

        this.disconnectTimeouts.set(playerId, timeout);
      }

      // Update room state (player marked as disconnected)
      if (this.gameState.room) await this.room.storage.put('room', this.gameState.room);
    }
  }

  broadcast(event: ServerEvent) {
    this.room.broadcast(JSON.stringify(event));
  }

  /**
   * Called when a scheduled alarm fires (via room.storage.setAlarm).
   * Used for ranking timeout - auto-assigns random ranks for players who haven't ranked.
   */
  async onAlarm() {
    if (!this.gameState.room) return;
    if (this.gameState.room.status !== 'in-progress') return;

    let stateChanged = false;

    // Check if turn timer expired (submission timer)
    const turnTimedOut = this.gameState.checkTurnTimeout();
    if (turnTimedOut && this.gameState.room.currentTurnPlayerId) {
      console.log(`Turn timeout: advancing turn for room ${this.room.id}`);
      this.broadcast({
        type: 'turn_changed',
        playerId: this.gameState.room.currentTurnPlayerId,
        timerEndAt: this.gameState.room.timerEndAt || null,
      });
      // Set alarm for next turn timer
      if (this.gameState.room.timerEndAt) {
        await this.room.storage.setAlarm(this.gameState.room.timerEndAt);
      }
      stateChanged = true;
    }

    // Check if ranking timer expired and auto-assign ranks
    const rankingTimedOut = this.gameState.checkRankingTimeout();
    if (rankingTimedOut) {
      console.log(`Ranking timeout: auto-assigned random ranks for room ${this.room.id}`);
      stateChanged = true;
    }

    if (stateChanged) {
      // Broadcast the updated room state
      this.broadcast({ type: 'room_updated', room: this.gameState.room });
      await this.room.storage.put('room', this.gameState.room);
    }
  }
}
