/**
 * Migration System Tests
 *
 * Tests for the database migration runner and utilities.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  MigrationRunner,
  generateChecksum,
  parseMigrationFilename,
  createMigrationFilename,
  createMigrationFile,
  MIGRATIONS_TABLE_SQL,
} from './migrations.js';
import type { DatabaseExecutor, MigrationFile } from './types.js';

// ============================================================================
// Mock Database Executor
// ============================================================================

function createMockExecutor(): DatabaseExecutor & {
  executedQueries: string[];
  mockResults: Map<string, unknown[]>;
  reset: () => void;
} {
  const executedQueries: string[] = [];
  const mockResults = new Map<string, unknown[]>();

  return {
    executedQueries,
    mockResults,

    reset() {
      executedQueries.length = 0;
      mockResults.clear();
    },

    async execute(sql: string) {
      executedQueries.push(sql);
      return { success: true };
    },

    async query<T>(sql: string) {
      executedQueries.push(sql);
      const results = mockResults.get(sql) || [];
      return { success: true, results: results as T[] };
    },
  };
}

// ============================================================================
// Checksum Tests
// ============================================================================

describe('generateChecksum', () => {
  it('generates consistent checksums for the same content', () => {
    const sql = 'CREATE TABLE test (id INTEGER);';
    const checksum1 = generateChecksum(sql);
    const checksum2 = generateChecksum(sql);
    expect(checksum1).toBe(checksum2);
  });

  it('generates different checksums for different content', () => {
    const sql1 = 'CREATE TABLE test (id INTEGER);';
    const sql2 = 'CREATE TABLE test (id TEXT);';
    const checksum1 = generateChecksum(sql1);
    const checksum2 = generateChecksum(sql2);
    expect(checksum1).not.toBe(checksum2);
  });

  it('trims whitespace before generating checksum', () => {
    const sql1 = '  CREATE TABLE test (id INTEGER);  ';
    const sql2 = 'CREATE TABLE test (id INTEGER);';
    const checksum1 = generateChecksum(sql1);
    const checksum2 = generateChecksum(sql2);
    expect(checksum1).toBe(checksum2);
  });

  it('returns a 16-character hex string', () => {
    const sql = 'SELECT * FROM test;';
    const checksum = generateChecksum(sql);
    expect(checksum).toMatch(/^[0-9a-f]{16}$/);
  });
});

// ============================================================================
// Filename Parsing Tests
// ============================================================================

describe('parseMigrationFilename', () => {
  it('parses valid migration filenames', () => {
    const result = parseMigrationFilename('001_initial_schema.sql');
    expect(result).toEqual({ version: 1, name: 'initial schema' });
  });

  it('parses filenames with multiple underscores', () => {
    const result = parseMigrationFilename('002_add_user_table.sql');
    expect(result).toEqual({ version: 2, name: 'add user table' });
  });

  it('parses filenames with high version numbers', () => {
    const result = parseMigrationFilename('999_final_migration.sql');
    expect(result).toEqual({ version: 999, name: 'final migration' });
  });

  it('returns null for invalid filenames', () => {
    expect(parseMigrationFilename('invalid.sql')).toBeNull();
    expect(parseMigrationFilename('001.sql')).toBeNull();
    expect(parseMigrationFilename('001_test.txt')).toBeNull();
    expect(parseMigrationFilename('abc_test.sql')).toBeNull();
  });
});

describe('createMigrationFilename', () => {
  it('creates valid migration filenames', () => {
    const filename = createMigrationFilename(1, 'initial schema');
    expect(filename).toBe('001_initial_schema.sql');
  });

  it('pads version numbers with zeros', () => {
    expect(createMigrationFilename(1, 'test')).toBe('001_test.sql');
    expect(createMigrationFilename(10, 'test')).toBe('010_test.sql');
    expect(createMigrationFilename(100, 'test')).toBe('100_test.sql');
  });

  it('sanitizes migration names', () => {
    const filename = createMigrationFilename(1, 'Add User Table!');
    expect(filename).toBe('001_add_user_table.sql');
  });

  it('removes special characters from names', () => {
    const filename = createMigrationFilename(1, 'add-user_table@v2');
    expect(filename).toBe('001_adduser_tablev2.sql');
  });
});

// ============================================================================
// Migration File Creation Tests
// ============================================================================

describe('createMigrationFile', () => {
  it('creates a migration file object with checksum', () => {
    const sql = 'CREATE TABLE test (id INTEGER);';
    const file = createMigrationFile(1, 'test', '001_test.sql', sql);

    expect(file).toEqual({
      version: 1,
      name: 'test',
      filename: '001_test.sql',
      sql,
      checksum: generateChecksum(sql),
    });
  });
});

// ============================================================================
// Migration Runner Tests
// ============================================================================

describe('MigrationRunner', () => {
  let executor: ReturnType<typeof createMockExecutor>;
  let runner: MigrationRunner;

  beforeEach(() => {
    executor = createMockExecutor();
    runner = new MigrationRunner(executor);
  });

  describe('ensureMigrationsTable', () => {
    it('executes the migrations table SQL', async () => {
      await runner.ensureMigrationsTable();
      expect(executor.executedQueries).toContain(MIGRATIONS_TABLE_SQL);
    });
  });

  describe('getAppliedMigrations', () => {
    it('returns empty array when no migrations applied', async () => {
      executor.mockResults.set(
        'SELECT version, name, applied_at, checksum FROM _migrations ORDER BY version',
        []
      );

      const applied = await runner.getAppliedMigrations();
      expect(applied).toEqual([]);
    });

    it('returns applied migrations from database', async () => {
      const mockMigrations = [
        { version: 1, name: 'test', applied_at: Date.now(), checksum: 'abc123' },
      ];
      executor.mockResults.set(
        'SELECT version, name, applied_at, checksum FROM _migrations ORDER BY version',
        mockMigrations
      );

      const applied = await runner.getAppliedMigrations();
      expect(applied).toEqual(mockMigrations);
    });
  });

  describe('getCurrentVersion', () => {
    it('returns 0 when no migrations applied', async () => {
      executor.mockResults.set(
        'SELECT version, name, applied_at, checksum FROM _migrations ORDER BY version',
        []
      );

      const version = await runner.getCurrentVersion();
      expect(version).toBe(0);
    });

    it('returns highest version number', async () => {
      executor.mockResults.set(
        'SELECT version, name, applied_at, checksum FROM _migrations ORDER BY version',
        [
          { version: 1, name: 'a', applied_at: Date.now(), checksum: 'a' },
          { version: 5, name: 'b', applied_at: Date.now(), checksum: 'b' },
          { version: 3, name: 'c', applied_at: Date.now(), checksum: 'c' },
        ]
      );

      const version = await runner.getCurrentVersion();
      expect(version).toBe(5);
    });
  });

  describe('getStatus', () => {
    it('marks all migrations as pending when none applied', async () => {
      executor.mockResults.set(
        'SELECT version, name, applied_at, checksum FROM _migrations ORDER BY version',
        []
      );

      const migrations: MigrationFile[] = [
        createMigrationFile(1, 'first', '001_first.sql', 'SQL 1'),
        createMigrationFile(2, 'second', '002_second.sql', 'SQL 2'),
      ];

      const statuses = await runner.getStatus(migrations);

      expect(statuses).toHaveLength(2);
      expect(statuses[0].status).toBe('pending');
      expect(statuses[1].status).toBe('pending');
    });

    it('marks migrations as applied when checksum matches', async () => {
      const sql = 'CREATE TABLE test;';
      const checksum = generateChecksum(sql);

      executor.mockResults.set(
        'SELECT version, name, applied_at, checksum FROM _migrations ORDER BY version',
        [{ version: 1, name: 'test', applied_at: Date.now(), checksum }]
      );

      const migrations: MigrationFile[] = [createMigrationFile(1, 'test', '001_test.sql', sql)];

      const statuses = await runner.getStatus(migrations);

      expect(statuses[0].status).toBe('applied');
    });

    it('marks migrations as modified when checksum differs', async () => {
      executor.mockResults.set(
        'SELECT version, name, applied_at, checksum FROM _migrations ORDER BY version',
        [{ version: 1, name: 'test', applied_at: Date.now(), checksum: 'old-checksum' }]
      );

      const migrations: MigrationFile[] = [
        createMigrationFile(1, 'test', '001_test.sql', 'NEW SQL'),
      ];

      const statuses = await runner.getStatus(migrations);

      expect(statuses[0].status).toBe('modified');
    });
  });

  describe('migrate', () => {
    it('applies pending migrations in order', async () => {
      executor.mockResults.set(
        'SELECT version, name, applied_at, checksum FROM _migrations ORDER BY version',
        []
      );

      const migrations: MigrationFile[] = [
        createMigrationFile(2, 'second', '002_second.sql', 'SQL 2'),
        createMigrationFile(1, 'first', '001_first.sql', 'SQL 1'),
      ];

      const result = await runner.migrate(migrations);

      expect(result.success).toBe(true);
      expect(result.applied).toHaveLength(2);
      // Should be applied in version order
      expect(result.applied[0].version).toBe(1);
      expect(result.applied[1].version).toBe(2);
    });

    it('skips already-applied migrations', async () => {
      const sql = 'SQL 1';
      const checksum = generateChecksum(sql);

      executor.mockResults.set(
        'SELECT version, name, applied_at, checksum FROM _migrations ORDER BY version',
        [{ version: 1, name: 'first', applied_at: Date.now(), checksum }]
      );

      const migrations: MigrationFile[] = [
        createMigrationFile(1, 'first', '001_first.sql', sql),
        createMigrationFile(2, 'second', '002_second.sql', 'SQL 2'),
      ];

      const result = await runner.migrate(migrations);

      expect(result.success).toBe(true);
      expect(result.skipped).toHaveLength(1);
      expect(result.applied).toHaveLength(1);
      expect(result.applied[0].version).toBe(2);
    });

    it('fails when a migration file has been modified', async () => {
      executor.mockResults.set(
        'SELECT version, name, applied_at, checksum FROM _migrations ORDER BY version',
        [{ version: 1, name: 'first', applied_at: Date.now(), checksum: 'old-checksum' }]
      );

      const migrations: MigrationFile[] = [
        createMigrationFile(1, 'first', '001_first.sql', 'MODIFIED SQL'),
      ];

      const result = await runner.migrate(migrations);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain('modified');
    });

    it('records applied migrations in the database', async () => {
      executor.mockResults.set(
        'SELECT version, name, applied_at, checksum FROM _migrations ORDER BY version',
        []
      );

      const migrations: MigrationFile[] = [
        createMigrationFile(1, 'first', '001_first.sql', 'SQL 1'),
      ];

      await runner.migrate(migrations);

      // Check that an INSERT was executed
      const insertQuery = executor.executedQueries.find((q) =>
        q.includes('INSERT INTO _migrations')
      );
      expect(insertQuery).toBeDefined();
      expect(insertQuery).toContain('version');
      expect(insertQuery).toContain('checksum');
    });
  });

  describe('validate', () => {
    it('passes validation for valid migrations', async () => {
      executor.mockResults.set(
        'SELECT version, name, applied_at, checksum FROM _migrations ORDER BY version',
        []
      );

      const migrations: MigrationFile[] = [
        createMigrationFile(1, 'first', '001_first.sql', 'SQL 1'),
        createMigrationFile(2, 'second', '002_second.sql', 'SQL 2'),
      ];

      const result = await runner.validate(migrations);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('fails validation for duplicate versions', async () => {
      executor.mockResults.set(
        'SELECT version, name, applied_at, checksum FROM _migrations ORDER BY version',
        []
      );

      const migrations: MigrationFile[] = [
        createMigrationFile(1, 'first', '001_first.sql', 'SQL 1'),
        createMigrationFile(1, 'also first', '001_also_first.sql', 'SQL 1 again'),
      ];

      const result = await runner.validate(migrations);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Duplicate'))).toBe(true);
    });

    it('fails validation for modified applied migrations', async () => {
      executor.mockResults.set(
        'SELECT version, name, applied_at, checksum FROM _migrations ORDER BY version',
        [{ version: 1, name: 'first', applied_at: Date.now(), checksum: 'old-checksum' }]
      );

      const migrations: MigrationFile[] = [
        createMigrationFile(1, 'first', '001_first.sql', 'MODIFIED SQL'),
      ];

      const result = await runner.validate(migrations);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('modified'))).toBe(true);
    });
  });
});
