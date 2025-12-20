/**
 * Migration System Types
 *
 * Defines the structure for database migrations.
 */

/**
 * A migration record stored in the _migrations table
 */
export interface MigrationRecord {
  version: number;
  name: string;
  applied_at: number;
  checksum: string;
}

/**
 * A migration file parsed from disk
 */
export interface MigrationFile {
  version: number;
  name: string;
  filename: string;
  sql: string;
  checksum: string;
}

/**
 * Migration status for display
 */
export interface MigrationStatus {
  version: number;
  name: string;
  status: 'applied' | 'pending' | 'modified';
  appliedAt?: Date;
}

/**
 * Result of running migrations
 */
export interface MigrationResult {
  success: boolean;
  applied: MigrationFile[];
  errors: Array<{ migration: MigrationFile; error: string }>;
  skipped: MigrationFile[];
}

/**
 * Database executor interface - abstraction over D1/wrangler
 */
export interface DatabaseExecutor {
  execute(sql: string): Promise<{ success: boolean; error?: string }>;
  query<T>(sql: string): Promise<{ success: boolean; results?: T[]; error?: string }>;
}
