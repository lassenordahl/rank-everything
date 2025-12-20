/**
 * Migration Runner
 *
 * Handles database migration execution with:
 * - Version tracking via _migrations table
 * - Checksum verification to detect modified migrations
 * - Forward-only migrations (no rollback by design)
 */

import type {
  MigrationRecord,
  MigrationFile,
  MigrationStatus,
  MigrationResult,
  DatabaseExecutor,
} from './types.js';

/**
 * SQL to create the migrations tracking table
 */
export const MIGRATIONS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS _migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at INTEGER NOT NULL,
  checksum TEXT NOT NULL
);
`;

/**
 * Simple hash function for generating checksums
 * Uses djb2 algorithm - fast and produces good distribution
 * Not cryptographic, but sufficient for change detection
 */
function simpleHash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  // Convert to hex and take 16 characters
  return (hash >>> 0).toString(16).padStart(8, '0') +
         ((hash >>> 16) ^ hash).toString(16).padStart(8, '0');
}

/**
 * Generate a checksum for migration content
 */
export function generateChecksum(sql: string): string {
  return simpleHash(sql.trim());
}

/**
 * Parse a migration filename into version and name
 * Expected format: 001_name_of_migration.sql
 */
export function parseMigrationFilename(filename: string): { version: number; name: string } | null {
  const match = filename.match(/^(\d+)_(.+)\.sql$/);
  if (!match) return null;

  const version = parseInt(match[1], 10);
  const name = match[2].replace(/_/g, ' ');

  return { version, name };
}

/**
 * Create a migration filename from version and name
 */
export function createMigrationFilename(version: number, name: string): string {
  const paddedVersion = version.toString().padStart(3, '0');
  const sanitizedName = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  return `${paddedVersion}_${sanitizedName}.sql`;
}

/**
 * Migration Runner Class
 */
export class MigrationRunner {
  constructor(private executor: DatabaseExecutor) {}

  /**
   * Ensure the migrations table exists
   */
  async ensureMigrationsTable(): Promise<void> {
    await this.executor.execute(MIGRATIONS_TABLE_SQL);
  }

  /**
   * Get all applied migrations from the database
   */
  async getAppliedMigrations(): Promise<MigrationRecord[]> {
    await this.ensureMigrationsTable();

    const result = await this.executor.query<MigrationRecord>(
      'SELECT version, name, applied_at, checksum FROM _migrations ORDER BY version'
    );

    return result.results || [];
  }

  /**
   * Get the current migration version (highest applied version)
   */
  async getCurrentVersion(): Promise<number> {
    const applied = await this.getAppliedMigrations();
    return applied.length > 0 ? Math.max(...applied.map((m) => m.version)) : 0;
  }

  /**
   * Check migration status against pending migrations
   */
  async getStatus(pendingMigrations: MigrationFile[]): Promise<MigrationStatus[]> {
    const applied = await this.getAppliedMigrations();
    const appliedMap = new Map(applied.map((m) => [m.version, m]));

    const statuses: MigrationStatus[] = [];

    for (const migration of pendingMigrations) {
      const appliedRecord = appliedMap.get(migration.version);

      if (!appliedRecord) {
        statuses.push({
          version: migration.version,
          name: migration.name,
          status: 'pending',
        });
      } else if (appliedRecord.checksum !== migration.checksum) {
        statuses.push({
          version: migration.version,
          name: migration.name,
          status: 'modified',
          appliedAt: new Date(appliedRecord.applied_at),
        });
      } else {
        statuses.push({
          version: migration.version,
          name: migration.name,
          status: 'applied',
          appliedAt: new Date(appliedRecord.applied_at),
        });
      }
    }

    return statuses.sort((a, b) => a.version - b.version);
  }

  /**
   * Run pending migrations
   */
  async migrate(migrations: MigrationFile[]): Promise<MigrationResult> {
    await this.ensureMigrationsTable();

    const applied = await this.getAppliedMigrations();
    const appliedVersions = new Set(applied.map((m) => m.version));

    const result: MigrationResult = {
      success: true,
      applied: [],
      errors: [],
      skipped: [],
    };

    // Sort migrations by version
    const sortedMigrations = [...migrations].sort((a, b) => a.version - b.version);

    for (const migration of sortedMigrations) {
      // Skip already applied migrations
      if (appliedVersions.has(migration.version)) {
        // Check for checksum mismatch (modified migration)
        const appliedRecord = applied.find((m) => m.version === migration.version);
        if (appliedRecord && appliedRecord.checksum !== migration.checksum) {
          result.errors.push({
            migration,
            error: `Migration ${migration.version} has been modified after being applied. Checksum mismatch.`,
          });
          result.success = false;
          break; // Stop on modified migration
        }
        result.skipped.push(migration);
        continue;
      }

      // Execute the migration
      const execResult = await this.executor.execute(migration.sql);

      if (!execResult.success) {
        result.errors.push({
          migration,
          error: execResult.error || 'Unknown error',
        });
        result.success = false;
        break; // Stop on error
      }

      // Record the migration
      const recordResult = await this.executor.execute(`
        INSERT INTO _migrations (version, name, applied_at, checksum)
        VALUES (${migration.version}, '${migration.name.replace(/'/g, "''")}', ${Date.now()}, '${migration.checksum}')
      `);

      if (!recordResult.success) {
        result.errors.push({
          migration,
          error: `Failed to record migration: ${recordResult.error}`,
        });
        result.success = false;
        break;
      }

      result.applied.push(migration);
    }

    return result;
  }

  /**
   * Validate migrations before running
   * Checks for gaps, duplicates, and modified applied migrations
   */
  async validate(migrations: MigrationFile[]): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Check for duplicate versions
    const versions = migrations.map((m) => m.version);
    const duplicates = versions.filter((v, i) => versions.indexOf(v) !== i);
    if (duplicates.length > 0) {
      errors.push(`Duplicate migration versions: ${[...new Set(duplicates)].join(', ')}`);
    }

    // Check for gaps in version numbers (warning, not error)
    const sortedVersions = [...versions].sort((a, b) => a - b);
    for (let i = 1; i < sortedVersions.length; i++) {
      if (sortedVersions[i] - sortedVersions[i - 1] > 1) {
        // This is a warning, not an error - gaps are allowed
      }
    }

    // Check for modified applied migrations
    const applied = await this.getAppliedMigrations();
    const appliedMap = new Map(applied.map((m) => [m.version, m]));

    for (const migration of migrations) {
      const appliedRecord = appliedMap.get(migration.version);
      if (appliedRecord && appliedRecord.checksum !== migration.checksum) {
        errors.push(
          `Migration ${migration.version} (${migration.name}) has been modified after being applied`
        );
      }
    }

    return { valid: errors.length === 0, errors };
  }
}

/**
 * Helper to create a MigrationFile from raw data
 */
export function createMigrationFile(
  version: number,
  name: string,
  filename: string,
  sql: string
): MigrationFile {
  return {
    version,
    name,
    filename,
    sql,
    checksum: generateChecksum(sql),
  };
}
