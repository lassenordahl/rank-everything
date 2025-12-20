import { type DatabaseExecutor, type GlobalItem } from '@rank-everything/db-schema';

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
  recentItems: GlobalItem[];
}

export class DashboardService {
  private executor: DatabaseExecutor;
  private isLocal: boolean;
  private apiDir: string;

  constructor(executor: DatabaseExecutor, isLocal: boolean, apiDir: string) {
    this.executor = executor;
    this.isLocal = isLocal;
    this.apiDir = apiDir;
  }

  async checkConnection(): Promise<boolean> {
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
      const result = await this.executor.query<{ count: number }>(
        'SELECT SUM(player_count) as count FROM rooms'
      );
      return result.results?.[0]?.count || 0;
    } catch {
      return 0;
    }
  }

  async getSystemStatus(): Promise<SystemStatus> {
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
      environment: this.isLocal ? 'local' : 'remote',
      dbConnection: connection,
      itemsCount: stats.itemsCount,
      emojiUsageToday: stats.emojiUsageToday,
      activeRooms,
      activeUsers,
      recentItems,
    };
  }
}
