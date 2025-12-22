/**
 * Cloudflare Worker for REST API endpoints
 * Works alongside PartyKit for WebSocket handling
 */

import type { GlobalItem, ClientLogRequest, ClientLogEntry } from '@rank-everything/shared-types';

export interface Env {
  DB: D1Database;
  ROOM_CACHE: KVNamespace;
  ANTHROPIC_API_KEY: string;
  MAX_ITEM_LENGTH: string;
  ROOM_TTL_MINUTES: string;
  ANTHROPIC_USAGE_CAP_DAILY: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Health check
      if (path === '/api/health') {
        return json({ status: 'ok', timestamp: Date.now() }, corsHeaders);
      }

      // Get random items for random roll feature
      if (path === '/api/random-items' && request.method === 'GET') {
        const count = parseInt(url.searchParams.get('count') || '5', 10);
        return await handleRandomItems(env, count, corsHeaders);
      }

      // Add item to global pool
      if (path === '/api/items' && request.method === 'POST') {
        const body = (await request.json()) as { text: string; emoji: string };
        return await handleAddItem(env, body.text, body.emoji, corsHeaders);
      }

      // Generate emoji for text
      if (path === '/api/emoji' && request.method === 'POST') {
        const body = (await request.json()) as { text: string };
        return await handleGenerateEmoji(env, body.text, corsHeaders);
      }

      // Client logging
      if (path === '/api/logs' && request.method === 'POST') {
        const body = (await request.json()) as ClientLogRequest;
        return await handleIngestLogs(env, body.logs, corsHeaders);
      }

      if (path === '/api/logs' && request.method === 'GET') {
        const limit = parseInt(url.searchParams.get('limit') || '50', 10);
        const offset = parseInt(url.searchParams.get('offset') || '0', 10);
        const level = url.searchParams.get('level');
        const type = url.searchParams.get('type');
        const search = url.searchParams.get('search');
        const sessionId = url.searchParams.get('session');

        return await handleQueryLogs(
          env,
          { limit, offset, level, type, search, sessionId },
          corsHeaders
        );
      }

      // Dashboard stats
      if (path === '/api/stats' && request.method === 'GET') {
        return await handleStats(env, corsHeaders);
      }

      // Room sync (called by PartyKit to update room state in D1)
      if (path === '/api/rooms/sync' && request.method === 'POST') {
        const body = (await request.json()) as {
          id: string;
          createdAt: number;
          playerCount: number;
          status: string;
        };
        return await handleSyncRoom(env, body, corsHeaders);
      }

      // Room delete (called by PartyKit when room is empty)
      if (path.startsWith('/api/rooms/') && request.method === 'DELETE') {
        const roomId = path.split('/api/rooms/')[1];
        if (roomId) {
          return await handleDeleteRoom(env, roomId, corsHeaders);
        }
      }

      // 404 for unknown routes
      return json({ error: 'Not found' }, corsHeaders, 404);
    } catch (error) {
      console.error('Worker error:', error);
      return json({ error: 'Internal server error' }, corsHeaders, 500);
    }
  },
};

// Helper to return JSON responses
function json(data: unknown, headers: Record<string, string>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

// Get random items from global pool
async function handleRandomItems(
  env: Env,
  count: number,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    // Get random items using SQLite's RANDOM()
    const result = await env.DB.prepare(
      `SELECT id, text, emoji, created_at as createdAt
       FROM global_items
       ORDER BY RANDOM()
       LIMIT ?`
    )
      .bind(Math.min(count, 20))
      .all<GlobalItem>();

    return json({ items: result.results || [] }, corsHeaders);
  } catch (error) {
    console.error('Failed to get random items:', error);
    return json({ items: [], error: 'Database error' }, corsHeaders);
  }
}

// Dashboard stats endpoint
async function handleStats(env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Run all queries in parallel
    const [roomsResult, itemsResult, emojiResult, recentItemsResult] = await Promise.all([
      // Active rooms (rooms with connected players, updated in last 10 minutes)
      env.DB.prepare(
        `SELECT
          COUNT(*) as activeRooms,
          COALESCE(SUM(player_count), 0) as activeUsers
         FROM rooms
         WHERE player_count > 0
           AND updated_at > ?`
      )
        .bind(Date.now() - 10 * 60 * 1000) // 10 minutes ago
        .first<{ activeRooms: number; activeUsers: number }>(),

      // Total items in global pool
      env.DB.prepare('SELECT COUNT(*) as count FROM global_items').first<{ count: number }>(),

      // Emoji usage today
      env.DB.prepare('SELECT count FROM emoji_usage WHERE date = ?')
        .bind(today)
        .first<{ count: number }>(),

      // Recent items (last 5)
      env.DB.prepare(
        `SELECT id, text, emoji, created_at as createdAt
         FROM global_items
         ORDER BY created_at DESC
         LIMIT 5`
      ).all<GlobalItem>(),
    ]);

    return json(
      {
        activeRooms: roomsResult?.activeRooms ?? 0,
        activeUsers: roomsResult?.activeUsers ?? 0,
        totalItems: itemsResult?.count ?? 0,
        emojiUsageToday: emojiResult?.count ?? 0,
        recentItems: recentItemsResult.results ?? [],
        timestamp: Date.now(),
      },
      corsHeaders
    );
  } catch (error) {
    console.error('Failed to get stats:', error);
    return json(
      {
        error: 'Failed to get stats',
        activeRooms: 0,
        activeUsers: 0,
        totalItems: 0,
        emojiUsageToday: 0,
        recentItems: [],
        timestamp: Date.now(),
      },
      corsHeaders,
      500
    );
  }
}

// Sync room state from PartyKit to D1
async function handleSyncRoom(
  env: Env,
  data: { id: string; createdAt: number; playerCount: number; status: string },
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    await env.DB.prepare(
      `INSERT OR REPLACE INTO rooms (id, created_at, updated_at, player_count, status)
       VALUES (?, ?, ?, ?, ?)`
    )
      .bind(data.id, data.createdAt, Date.now(), data.playerCount, data.status)
      .run();

    return json({ success: true }, corsHeaders);
  } catch (error) {
    console.error('[Worker] Failed to sync room:', error);
    return json({ error: 'Failed to sync room' }, corsHeaders, 500);
  }
}

// Delete room from D1
async function handleDeleteRoom(
  env: Env,
  roomId: string,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    await env.DB.prepare('DELETE FROM rooms WHERE id = ?').bind(roomId).run();

    return json({ success: true }, corsHeaders);
  } catch (error) {
    console.error('[Worker] Failed to delete room:', error);
    return json({ error: 'Failed to delete room' }, corsHeaders, 500);
  }
}

// Add item to global pool
async function handleAddItem(
  env: Env,
  text: string,
  emoji: string,
  corsHeaders: Record<string, string>
): Promise<Response> {
  console.log('[Worker] handleAddItem called:', { text, emoji });

  const maxLength = parseInt(env.MAX_ITEM_LENGTH || '100', 10);

  if (!text || text.length > maxLength) {
    console.log('[Worker] Invalid item text, rejecting');
    return json({ error: 'Invalid item text' }, corsHeaders, 400);
  }

  try {
    const id = `item_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    console.log('[Worker] Inserting item with id:', id);

    const result = await env.DB.prepare(
      `INSERT OR IGNORE INTO global_items (id, text, emoji, created_at)
       VALUES (?, ?, ?, ?)`
    )
      .bind(id, text.trim(), emoji, Date.now())
      .run();

    console.log('[Worker] Insert result:', JSON.stringify(result.meta));

    return json({ success: true, id }, corsHeaders);
  } catch (error) {
    console.error('[Worker] Failed to add item:', error);
    return json({ error: 'Failed to add item' }, corsHeaders, 500);
  }
}

// Generate emoji using Anthropic Haiku
async function handleGenerateEmoji(
  env: Env,
  text: string,
  corsHeaders: Record<string, string>
): Promise<Response> {
  if (!text) {
    return json({ error: 'Text required' }, corsHeaders, 400);
  }

  // Check usage cap
  const today = new Date().toISOString().split('T')[0];
  const usageCapDaily = parseInt(env.ANTHROPIC_USAGE_CAP_DAILY || '1000', 10);

  try {
    // Get current usage
    const usageResult = await env.DB.prepare(`SELECT count FROM emoji_usage WHERE date = ?`)
      .bind(today)
      .first<{ count: number }>();

    const currentUsage = usageResult?.count || 0;

    if (currentUsage >= usageCapDaily) {
      // Return random fallback emoji
      const fallbackEmojis = ['🎲', '✨', '🌟', '💫', '🎯', '🎪', '🎭', '🎨'];
      const emoji = fallbackEmojis[Math.floor(Math.random() * fallbackEmojis.length)];
      return json({ emoji, source: 'fallback' }, corsHeaders);
    }

    // Call Anthropic API
    if (!env.ANTHROPIC_API_KEY) {
      const fallbackEmojis = ['🎲', '✨', '🌟', '💫', '🎯', '🎪', '🎭', '🎨'];
      const emoji = fallbackEmojis[Math.floor(Math.random() * fallbackEmojis.length)];
      return json({ emoji, source: 'fallback' }, corsHeaders);
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [
          {
            role: 'user',
            content: `Reply with exactly ONE emoji that best represents: "${text}". Only the emoji, nothing else.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = (await response.json()) as {
      content: Array<{ type: string; text: string }>;
    };

    const emoji = data.content[0]?.text?.trim() || '🎲';

    // Update usage counter
    await env.DB.prepare(
      `INSERT INTO emoji_usage (date, count, updated_at)
       VALUES (?, 1, ?)
       ON CONFLICT(date) DO UPDATE SET count = count + 1, updated_at = ?`
    )
      .bind(today, Date.now(), Date.now())
      .run();

    return json({ emoji, source: 'haiku' }, corsHeaders);
  } catch (error) {
    console.error('Emoji generation error:', error);
    // Fallback to random emoji
    const fallbackEmojis = ['🎲', '✨', '🌟', '💫', '🎯', '🎪', '🎭', '🎨'];
    const emoji = fallbackEmojis[Math.floor(Math.random() * fallbackEmojis.length)];
    return json({ emoji, source: 'fallback' }, corsHeaders);
  }
}

// Ingest client logs
async function handleIngestLogs(
  env: Env,
  logs: Omit<ClientLogEntry, 'id'>[],
  corsHeaders: Record<string, string>
): Promise<Response> {
  if (!logs || !Array.isArray(logs) || logs.length === 0) {
    return json({ success: true, count: 0 }, corsHeaders);
  }

  try {
    const stmt = env.DB.prepare(`
      INSERT INTO client_logs (
        id, session_id, timestamp, level, type, message,
        stack, component_stack, context, user_agent, room_code, url, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const batch = logs.map((log) => {
      const id = crypto.randomUUID();
      return stmt.bind(
        id,
        log.sessionId,
        log.timestamp,
        log.level,
        log.type,
        log.message,
        log.stack || null,
        log.componentStack || null,
        log.context ? JSON.stringify(log.context) : null,
        log.userAgent,
        log.roomCode || null,
        log.url,
        Date.now()
      );
    });

    await env.DB.batch(batch);

    return json({ success: true, count: logs.length }, corsHeaders);
  } catch (error) {
    console.error('Failed to ingest logs:', error);
    return json({ error: 'Failed to save logs' }, corsHeaders, 500);
  }
}

// Query logs
async function handleQueryLogs(
  env: Env,
  params: {
    limit: number;
    offset: number;
    level: string | null;
    type: string | null;
    search: string | null;
    sessionId: string | null;
  },
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    let query = `
      SELECT
        id, session_id as sessionId, timestamp, level, type, message,
        stack, component_stack as componentStack, context,
        user_agent as userAgent, room_code as roomCode, url, created_at as createdAt
      FROM client_logs
      WHERE 1=1
    `;
    const args: (string | number)[] = [];

    if (params.level) {
      query += ` AND level = ?`;
      args.push(params.level);
    }

    if (params.type) {
      query += ` AND type = ?`;
      args.push(params.type);
    }

    if (params.sessionId) {
      query += ` AND session_id = ?`;
      args.push(params.sessionId);
    }

    if (params.search) {
      query += ` AND message LIKE ?`;
      args.push(`%${params.search}%`);
    }

    query += ` ORDER BY timestamp DESC LIMIT ? OFFSET ?`;
    args.push(Math.min(params.limit, 100));
    args.push(params.offset);

    const { results } = await env.DB.prepare(query)
      .bind(...args)
      .all();

    // Parse context JSON
    const logs = results.map((log) => ({
      ...log,
      context: typeof log.context === 'string' ? JSON.parse(log.context) : log.context,
    }));

    return json({ logs }, corsHeaders);
  } catch (error) {
    console.error('Failed to query logs:', error);
    return json({ error: 'Failed to query logs' }, corsHeaders, 500);
  }
}
