import { type DatabaseExecutor } from '@rank-everything/db-schema';
import type { GlobalItem } from '@rank-everything/shared-types';

export interface EmojiUsage {
  date: string;
  count: number;
  updated_at: number;
}

export interface SystemStatus {
  environment: 'dist' | 'local' | 'remote';
  dbConnection: boolean;
  itemsCount: number;
  emojiUsageToday: number;
  activeRooms: number;
  activeUsers: number;
  recentItems: GlobalItem[];
}

interface StatsApiResponse {
  activeRooms: number;
  activeUsers: number;
  totalItems: number;
  emojiUsageToday: number;
  recentItems: GlobalItem[];
  timestamp: number;
  error?: string;
}

// Production Worker URL
const PROD_WORKER_URL = 'https://rank-everything-api.lassenordahl.workers.dev';

export class DashboardService {
  private executor: DatabaseExecutor;
  private isLocal: boolean;
  private apiDir: string;

  constructor(executor: DatabaseExecutor, isLocal: boolean, apiDir: string) {
    this.executor = executor;
    this.isLocal = isLocal;
    this.apiDir = apiDir;
  }

  /**
   * For production mode, fetch stats directly from the Worker API.
   * This is more reliable than using wrangler remote access.
   */
  private async fetchStatsFromApi(signal?: AbortSignal): Promise<StatsApiResponse | null> {
    try {
      const response = await fetch(`${PROD_WORKER_URL}/api/stats`, { signal });
      if (!response.ok) {
        console.error(`API error: ${response.status}`);
        return null;
      }
      return (await response.json()) as StatsApiResponse;
    } catch (error) {
      // Re-throw abort errors so they can be handled upstream
      if (error instanceof Error && error.name === 'AbortError') throw error;
      console.error('Failed to fetch stats from API:', error);
      return null;
    }
  }

  async checkConnection(): Promise<boolean> {
    // For remote mode, check API availability
    if (!this.isLocal) {
      try {
        const response = await fetch(`${PROD_WORKER_URL}/api/health`);
        return response.ok;
      } catch {
        return false;
      }
    }

    // For local mode, check D1 via wrangler
    const result = await this.executor.query<{ name: string }>(
      'SELECT name FROM sqlite_master LIMIT 1'
    );
    return result.success;
  }

  async getGlobalStats(): Promise<{ itemsCount: number; emojiUsageToday: number }> {
    const itemsResult = await this.executor.query<{ count: number }>(
      'SELECT COUNT(*) as count FROM global_items'
    );
    // Using simple today check for speed
    const today = new Date().toISOString().split('T')[0];
    const emojiResult = await this.executor.query<{ count: number }>(
      `SELECT count FROM emoji_usage WHERE date = '${today}'`
    );

    return {
      itemsCount: itemsResult.results?.[0]?.count || 0,
      emojiUsageToday: emojiResult.results?.[0]?.count || 0,
    };
  }

  async getRecentItems(limit = 5): Promise<GlobalItem[]> {
    const result = await this.executor.query<GlobalItem>(`
      SELECT * FROM global_items
      ORDER BY created_at DESC
      LIMIT ${limit}
    `);

    return result.results || [];
  }

  async getActiveRoomCount(): Promise<number> {
    try {
      // Get count of rooms with active players
      const result = await this.executor.query<{ count: number }>(
        'SELECT COUNT(*) as count FROM rooms WHERE player_count > 0'
      );
      return result.results?.[0]?.count || 0;
    } catch (_e) {
      console.error('Error fetching room count:', _e);
      return 0;
    }
  }

  async getActiveUserCount(): Promise<number> {
    try {
      const result = await this.executor.query<{ count: number | null }>(
        'SELECT COALESCE(SUM(player_count), 0) as count FROM rooms'
      );
      return result.results?.[0]?.count ?? 0;
    } catch {
      return 0;
    }
  }

  async getSystemStatus(signal?: AbortSignal): Promise<SystemStatus> {
    // For remote/production mode, use the HTTP API directly
    // This is more reliable than wrangler --remote
    if (!this.isLocal) {
      const apiStats = await this.fetchStatsFromApi(signal);

      if (apiStats) {
        return {
          environment: 'remote',
          dbConnection: true,
          itemsCount: apiStats.totalItems,
          emojiUsageToday: apiStats.emojiUsageToday,
          activeRooms: apiStats.activeRooms,
          activeUsers: apiStats.activeUsers,
          recentItems: apiStats.recentItems,
        };
      }

      // API failed, return error state
      return {
        environment: 'remote',
        dbConnection: false,
        itemsCount: 0,
        emojiUsageToday: 0,
        activeRooms: 0,
        activeUsers: 0,
        recentItems: [],
      };
    }

    // Local mode: use wrangler D1 queries
    const connection = await this.checkConnection();
    let stats = { itemsCount: 0, emojiUsageToday: 0 };
    let recentItems: GlobalItem[] = [];
    let activeRooms = 0;
    let activeUsers = 0;

    if (connection) {
      try {
        const [statsRes, recentRes, roomsRes, usersRes] = await Promise.all([
          this.getGlobalStats(),
          this.getRecentItems(),
          this.getActiveRoomCount(),
          this.getActiveUserCount(),
        ]);
        stats = statsRes;
        recentItems = recentRes;
        activeRooms = roomsRes;
        activeUsers = usersRes;
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    }

    return {
      environment: 'local',
      dbConnection: connection,
      itemsCount: stats.itemsCount,
      emojiUsageToday: stats.emojiUsageToday,
      activeRooms,
      activeUsers,
      recentItems,
    };
  }
}
