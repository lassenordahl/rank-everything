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

  /**
   * Sync room state to D1 via HTTP call to the Worker.
   * PartyKit managed hosting doesn't have D1 bindings, so we must use HTTP.
   */
  async syncRoomToDB() {
    if (!this.gameState.room) return;

    const room = this.gameState.room;
    const activeCount = Array.from(this.gameState.connections.values()).length;

    console.log(
      `[Server] syncRoomToDB: Syncing room ${room.id} with ${activeCount} players, status=${room.status}`
    );

    try {
      const response = await fetch(`${this.apiUrl}/api/rooms/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: room.id,
          createdAt: room.createdAt,
          playerCount: activeCount,
          status: room.status,
        }),
      });

      const text = await response.text();
      if (!response.ok) {
        console.error(`[Server] syncRoomToDB failed: ${response.status} ${text}`);
      } else {
        console.log(`[Server] syncRoomToDB success: ${text}`);
      }
    } catch (e) {
      console.error('[Server] syncRoomToDB error:', e);
    }
  }

  /**
   * Delete room from D1 via HTTP call to the Worker.
   */
  async deleteRoomFromDB() {
    try {
      const response = await fetch(`${this.apiUrl}/api/rooms/${this.room.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const text = await response.text();
        console.error(`[Server] deleteRoomFromDB failed: ${response.status} ${text}`);
      } else {
        console.log(`[Server] Deleted room ${this.room.id} from DB`);
      }
    } catch (e) {
      console.error('[Server] deleteRoomFromDB error:', e);
    }
  }

  constructor(readonly room: Party.Room) {
    this.gameState = new GameRoomState({
      room: null,
      connections: new Map(),
    });

    // Log initial configuration
    const envUrl = room.env?.WORKER_URL as string | undefined;
    console.log(`[Server] Constructor. Configured WORKER_URL: ${envUrl}`);

    // Use production URL if not local (trim to handle env vars with trailing newlines)
    if (envUrl) {
      this.apiUrl = envUrl.trim();
      console.log(`[Server] Set apiUrl to: ${this.apiUrl}`);
    } else {
      console.log(`[Server] Defaulting apiUrl to localhost: ${this.apiUrl}`);
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
    // ... handler implementation ...
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
              await this.syncRoomToDB();
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
            if (response.ok && this.gameState.room) {
              await this.room.storage.put('room', this.gameState.room);
              await this.syncRoomToDB();
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
              if (this.gameState.room.timerEndAt) {
                await this.room.storage.setAlarm(this.gameState.room.timerEndAt);
              }
              await this.syncRoomToDB();
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

  // ... rest of class ...

  // Need to skip to saveToGlobalPool to replace it too, but replace_file_content works on chunks.
  // I will just do the constructor first.

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
      // Sync on connect to update player count
      await this.syncRoomToDB();
    }
  }

  async onMessage(message: string, sender: Party.Connection) {
    try {
      const data = JSON.parse(message) as ClientEvent;

      switch (data.type) {
        case 'submit_item':
          console.log('[Server] onMessage: submit_item received, calling handleSubmitItem');
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
            // Do NOT end game yet! We must wait for ranking.
            // Just don't advance turn (since no more submissions needed)
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

        case 'rank_item': {
          const playerId = this.gameState.connections.get(sender.id);
          await handleRankItem(data, sender, this.gameState, (e) => this.broadcast(e));

          // Check if late joiner caught up after ranking
          if (playerId && this.gameState.checkPlayerCaughtUp(playerId)) {
            console.log(`[Server] Player ${playerId} caught up on rankings and is now active.`);
            if (this.gameState.room) {
              this.broadcast({ type: 'room_updated', room: this.gameState.room });
            }
          }

          // Check if game should end (all active players ranked all items)
          if (this.gameState.room) {
            const { items, players, config } = this.gameState.room;
            const targetCount = config.itemsPerGame;

            console.log(
              `[Server] Checking game end. Items: ${items.length}, Target: ${targetCount}, Players: ${players.length}`
            );

            // Must have enough items first
            if (items.length >= targetCount) {
              // All players (including those who were catching up) must have ranked all items
              const allDone = players.every((p) => {
                const rankCount = Object.keys(p.rankings).length;
                const isCaughtUp = !p.isCatchingUp;
                console.log(
                  `[Server] Player ${p.nickname} rankings: ${rankCount}/${targetCount}, caughtUp: ${isCaughtUp}`
                );
                return rankCount >= targetCount && isCaughtUp;
              });

              if (allDone) {
                console.log('[Server] Game Ended! Broadcasting events.');
                this.gameState.endGame();
                this.broadcast({ type: 'game_ended' });
                if (this.gameState.room) {
                  this.broadcast({ type: 'room_updated', room: this.gameState.room });
                }
                // Sync finished status to DB
                await this.syncRoomToDB();
              }
            }

            await this.room.storage.put('room', this.gameState.room);
          }
          break;
        }

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

        case 'ping':
          // Respond to heartbeat ping with pong
          sender.send(JSON.stringify({ type: 'pong' }));
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

  /**
   * Save item to global pool via HTTP call to the Worker.
   * PartyKit managed hosting doesn't have D1 bindings, so we must use HTTP.
   */
  async saveToGlobalPool(text: string, emoji: string): Promise<void> {
    const url = `${this.apiUrl}/api/items`;
    console.log(`[Server] saveToGlobalPool: POST ${url}`, { text, emoji });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, emoji }),
      });

      const responseText = await response.text();
      console.log(`[Server] saveToGlobalPool: Response ${response.status}: ${responseText}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${responseText}`);
      }
    } catch (error) {
      console.error('[Server] saveToGlobalPool: FAILED:', error);
      throw error; // Re-throw so caller knows it failed
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
      // Sync on reconnect
      await this.syncRoomToDB();
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
        console.log(`Host migrated to: ${this.gameState.room.hostPlayerId}`);
        this.broadcast({ type: 'room_updated', room: this.gameState.room });
      }

      // Sync on disconnect (updates player count)
      await this.syncRoomToDB();

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
              await this.deleteRoomFromDB();
            } else if (this.gameState.room) {
              await this.room.storage.put('room', this.gameState.room);
              await this.syncRoomToDB();
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

  /**
   * Handle global fetch requests (e.g. /api/*) that are not targeted at a specific room.
   * This is a static method that runs at the edge for every HTTP request.
   */
  static async onFetch(
    req: Party.Request,
    lobby: Party.FetchLobby,
    _ctx: Party.ExecutionContext
  ): Promise<Response> {
    const url = new URL(req.url);

    // Proxy /api requests to the Cloudflare Worker
    if (url.pathname.startsWith('/api')) {
      // In production, use the deployed worker URL
      // The WORKER_URL should be set in partykit.json vars
      const workerOrigin =
        (lobby.env?.WORKER_URL as string) ||
        'https://rank-everything-api.lasseanordahl.workers.dev';

      try {
        const targetUrl = new URL(url.pathname + url.search, workerOrigin);

        console.log(`[Proxy] Forwarding ${req.method} ${url.pathname} to ${targetUrl.toString()}`);

        return await fetch(targetUrl.toString(), {
          method: req.method,
          headers: req.headers,
          body: req.body,
          redirect: 'follow',
        });
      } catch (e) {
        console.error('[Proxy] Failed to proxy request:', e);
        return new Response('Proxy Error', { status: 502 });
      }
    }

    return new Response('Not found', { status: 404 });
  }
}
