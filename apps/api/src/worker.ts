/**
 * Cloudflare Worker for REST API endpoints
 * Works alongside PartyKit for WebSocket handling
 */

import type { GlobalItem } from '@rank-everything/shared-types';

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
        const body = await request.json() as { text: string; emoji: string };
        return await handleAddItem(env, body.text, body.emoji, corsHeaders);
      }

      // Generate emoji for text
      if (path === '/api/emoji' && request.method === 'POST') {
        const body = await request.json() as { text: string };
        return await handleGenerateEmoji(env, body.text, corsHeaders);
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

// Add item to global pool
async function handleAddItem(
  env: Env,
  text: string,
  emoji: string,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const maxLength = parseInt(env.MAX_ITEM_LENGTH || '100', 10);

  if (!text || text.length > maxLength) {
    return json({ error: 'Invalid item text' }, corsHeaders, 400);
  }

  try {
    const id = `item_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    await env.DB.prepare(
      `INSERT OR IGNORE INTO global_items (id, text, emoji, created_at)
       VALUES (?, ?, ?, ?)`
    )
      .bind(id, text.trim(), emoji, Date.now())
      .run();

    return json({ success: true, id }, corsHeaders);
  } catch (error) {
    console.error('Failed to add item:', error);
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
    const usageResult = await env.DB.prepare(
      `SELECT count FROM emoji_usage WHERE date = ?`
    )
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

    const data = await response.json() as {
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
