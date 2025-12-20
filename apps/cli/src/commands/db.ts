/**
 * Database CLI Commands
 *
 * Provides commands for database management:
 * - migrate: Run pending migrations with tracking
 * - migrate:create: Create a new migration file
 * - migrate:status: Show migration status
 * - seed: Seed the database with test data
 * - reset: Reset database to clean state
 * - inspect: Inspect database schema/data
 * - create: Create the D1 database
 */

import chalk from 'chalk';
import ora from 'ora';
import { resolve, dirname } from 'path';
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import {
  MigrationRunner,
  parseMigrationFilename,
  createMigrationFilename,
  createMigrationFile,
  type MigrationFile,
  type MigrationStatus,
} from '@rank-everything/db-schema';

import { createWranglerExecutor, runWrangler } from '../lib/db-executor.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ============================================================================
// Types
// ============================================================================

interface MigrateOptions {
  status?: boolean;
  local?: boolean;
  remote?: boolean;
}

type MigrateCreateOptions = Record<string, never>;

interface SeedOptions {
  local?: boolean;
  remote?: boolean;
}

interface ResetOptions {
  seed?: boolean;
  local?: boolean;
  remote?: boolean;
  force?: boolean;
}

interface InspectOptions {
  json?: boolean;
  local?: boolean;
  remote?: boolean;
}

// ============================================================================
// Path Helpers
// ============================================================================

function getPaths() {
  const cliDir = resolve(__dirname, '../..');
  const rootDir = resolve(cliDir, '../..');
  const apiDir = resolve(rootDir, 'apps/api');
  const migrationsDir = resolve(rootDir, 'packages/db-schema/migrations');
  return { cliDir, rootDir, apiDir, migrationsDir };
}

// ============================================================================
// Migration File Loader
// ============================================================================

function loadMigrationsFromDirectory(migrationsDir: string): MigrationFile[] {
  if (!existsSync(migrationsDir)) {
    return [];
  }

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const migrations: MigrationFile[] = [];

  for (const filename of files) {
    const parsed = parseMigrationFilename(filename);
    if (!parsed) {
      console.warn(chalk.yellow(`Skipping invalid migration filename: ${filename}`));
      continue;
    }

    const filePath = resolve(migrationsDir, filename);
    const sql = readFileSync(filePath, 'utf-8');

    migrations.push(createMigrationFile(parsed.version, parsed.name, filename, sql));
  }

  return migrations;
}

// ============================================================================
// Status Display Helper
// ============================================================================

function displayMigrationStatus(statuses: MigrationStatus[]): void {
  if (statuses.length === 0) {
    console.log(chalk.yellow('  No migrations found'));
    return;
  }

  const maxNameLen = Math.max(...statuses.map((s) => s.name.length));

  for (const status of statuses) {
    const icon =
      status.status === 'applied'
        ? chalk.green('✓')
        : status.status === 'pending'
          ? chalk.yellow('○')
          : chalk.red('⚠');

    const name = status.name.padEnd(maxNameLen);
    const version = String(status.version).padStart(3, '0');

    let statusText: string;
    if (status.status === 'applied') {
      const date = status.appliedAt ? status.appliedAt.toISOString().split('T')[0] : 'unknown';
      statusText = chalk.green(`applied (${date})`);
    } else if (status.status === 'pending') {
      statusText = chalk.yellow('pending');
    } else {
      statusText = chalk.red('MODIFIED - migration file changed after being applied!');
    }

    console.log(`  ${icon} ${version} ${name}  ${statusText}`);
  }
}

// ============================================================================
// CLI Commands
// ============================================================================

export const dbCommands = {
  /**
   * Run database migrations
   */
  async migrate(options: MigrateOptions): Promise<void> {
    console.log(chalk.bold('\n📦 Database Migrations\n'));

    const { apiDir, migrationsDir } = getPaths();
    const isLocal = options.local !== false && !options.remote;
    const target = isLocal ? 'local' : 'remote';

    // Load migrations from files
    const migrations = loadMigrationsFromDirectory(migrationsDir);

    if (migrations.length === 0) {
      console.log(chalk.yellow('No migration files found in:'));
      console.log(chalk.dim(`  ${migrationsDir}`));
      return;
    }

    console.log(chalk.cyan(`Found ${migrations.length} migration(s)\n`));

    // Create executor
    const executor = createWranglerExecutor(apiDir, isLocal);
    const runner = new MigrationRunner(executor);

    // Show status if requested
    if (options.status) {
      console.log(chalk.cyan(`Migration status (${target}):\n`));

      try {
        const statuses = await runner.getStatus(migrations);
        displayMigrationStatus(statuses);
      } catch {
        console.log(chalk.red('Failed to get migration status.'));
        console.log(chalk.dim('Make sure the database exists and is accessible.'));
        if (isLocal) {
          console.log(chalk.dim('\nRun migrations first with: pnpm rank db migrate'));
        }
      }

      console.log('');
      return;
    }

    // Validate migrations
    console.log(chalk.dim('Validating migrations...'));
    const validation = await runner.validate(migrations);

    if (!validation.valid) {
      console.log(chalk.red('\n❌ Migration validation failed:\n'));
      for (const error of validation.errors) {
        console.log(chalk.red(`  • ${error}`));
      }
      console.log('');
      return;
    }

    // Run migrations
    console.log(chalk.cyan(`Running migrations (${target})...\n`));

    const result = await runner.migrate(migrations);

    // Display results
    if (result.skipped.length > 0) {
      console.log(chalk.dim(`Skipped ${result.skipped.length} already-applied migration(s)`));
    }

    if (result.applied.length > 0) {
      console.log(chalk.green(`\n✓ Applied ${result.applied.length} migration(s):`));
      for (const m of result.applied) {
        console.log(chalk.green(`  • ${String(m.version).padStart(3, '0')}_${m.name}`));
      }
    } else if (result.errors.length === 0) {
      console.log(chalk.green('✓ All migrations already applied'));
    }

    if (result.errors.length > 0) {
      console.log(chalk.red(`\n❌ Errors during migration:`));
      for (const e of result.errors) {
        console.log(chalk.red(`  • ${e.migration.filename}: ${e.error}`));
      }
    }

    console.log('');
  },

  /**
   * Create a new migration file
   */
  async createMigration(name: string, _options: MigrateCreateOptions): Promise<void> {
    console.log(chalk.bold('\n📝 Creating Migration\n'));

    const { migrationsDir } = getPaths();

    // Ensure migrations directory exists
    if (!existsSync(migrationsDir)) {
      mkdirSync(migrationsDir, { recursive: true });
    }

    // Find next version number
    const existingMigrations = loadMigrationsFromDirectory(migrationsDir);
    const nextVersion =
      existingMigrations.length > 0 ? Math.max(...existingMigrations.map((m) => m.version)) + 1 : 1;

    // Create filename
    const filename = createMigrationFilename(nextVersion, name);
    const filePath = resolve(migrationsDir, filename);

    // Create migration file with template
    const template = `-- Migration: ${String(nextVersion).padStart(3, '0')}_${name.toLowerCase().replace(/\s+/g, '_')}
-- Description: ${name}
-- Applied: Forward-only migration

-- Add your SQL statements here
-- Example:
-- CREATE TABLE IF NOT EXISTS my_table (
--   id TEXT PRIMARY KEY,
--   name TEXT NOT NULL,
--   created_at INTEGER NOT NULL
-- );

`;

    writeFileSync(filePath, template);

    console.log(chalk.green(`✓ Created migration file:`));
    console.log(chalk.cyan(`  ${filePath}`));
    console.log(chalk.dim('\nEdit the file to add your SQL statements.'));
    console.log('');
  },

  /**
   * Seed database with test data
   */
  async seed(options: SeedOptions): Promise<void> {
    console.log(chalk.bold('\n🌱 Seeding Database\n'));

    const { apiDir, migrationsDir } = getPaths();
    const isLocal = options.local !== false && !options.remote;
    const target = isLocal ? '--local' : '--remote';

    // Look for seed migration (002_seed_items.sql)
    const seedFile = resolve(migrationsDir, '002_seed_items.sql');

    if (!existsSync(seedFile)) {
      console.log(chalk.red('Seed file not found: 002_seed_items.sql'));
      console.log(chalk.dim(`Expected at: ${seedFile}`));
      return;
    }

    const spinner = ora(`Seeding database (${isLocal ? 'local' : 'remote'})...`).start();

    const result = runWrangler(
      ['d1', 'execute', 'rank-everything-db', target, '--file', seedFile],
      apiDir,
      true
    );

    if (result.success) {
      spinner.succeed('Database seeded with 30 items');
    } else if (
      result.error?.includes('UNIQUE constraint') ||
      result.output?.includes('UNIQUE constraint')
    ) {
      spinner.warn('Seed data already exists (duplicates ignored)');
    } else {
      spinner.fail('Failed to seed database');
      console.log(chalk.dim(result.error || result.output));
    }

    console.log('');
  },

  /**
   * Reset database to clean state
   */
  async reset(options: ResetOptions): Promise<void> {
    console.log(chalk.bold('\n🗑️  Resetting Database\n'));

    const { apiDir } = getPaths();
    const isLocal = options.local !== false && !options.remote;
    const target = isLocal ? '--local' : '--remote';

    if (!isLocal && !options.force) {
      console.log(chalk.red('⚠️  WARNING: This will reset the PRODUCTION database!'));
      console.log(chalk.yellow('Use --force to confirm, or use --local for local database.'));
      console.log('');
      return;
    }

    console.log(chalk.yellow(`Resetting ${isLocal ? 'local' : 'REMOTE'} database...\n`));

    // Drop all tables including _migrations
    const dropSpinner = ora('Dropping tables...').start();

    const dropResult = runWrangler(
      [
        'd1',
        'execute',
        'rank-everything-db',
        target,
        '--command',
        'DROP TABLE IF EXISTS global_items; DROP TABLE IF EXISTS emoji_usage; DROP TABLE IF EXISTS daily_challenges; DROP TABLE IF EXISTS _migrations;',
      ],
      apiDir,
      true
    );

    if (dropResult.success) {
      dropSpinner.succeed('Tables dropped');
    } else {
      dropSpinner.fail('Failed to drop tables');
      console.log(chalk.dim(dropResult.error || dropResult.output));
    }

    // Re-run migrations
    console.log('');
    await this.migrate({ local: isLocal, remote: !isLocal });

    // Optionally seed
    if (options.seed) {
      await this.seed({ local: isLocal, remote: !isLocal });
    }
  },

  /**
   * Inspect database schema or table contents
   */
  async inspect(table: string | undefined, options: InspectOptions): Promise<void> {
    console.log(chalk.bold('\n🔍 Database Inspection\n'));

    const { apiDir } = getPaths();
    const isLocal = options.local !== false && !options.remote;
    const target = isLocal ? '--local' : '--remote';

    let query: string;

    if (table) {
      query = `SELECT * FROM ${table} LIMIT 20`;
      console.log(chalk.cyan(`Inspecting table: ${table} (${isLocal ? 'local' : 'remote'})\n`));
    } else {
      query =
        "SELECT name, type FROM sqlite_master WHERE type IN ('table', 'index') ORDER BY type, name";
      console.log(chalk.cyan(`Database schema (${isLocal ? 'local' : 'remote'}):\n`));
    }

    if (options.json) {
      const result = runWrangler(
        ['d1', 'execute', 'rank-everything-db', target, '--command', query, '--json'],
        apiDir,
        true
      );

      if (result.success) {
        console.log(result.output);
      } else {
        console.log(chalk.red('Failed to query database'));
        console.log(chalk.dim(result.error || result.output));
      }
    } else {
      const result = runWrangler(
        ['d1', 'execute', 'rank-everything-db', target, '--command', query],
        apiDir
      );

      if (!result.success) {
        console.log(chalk.red('\nFailed to inspect database.'));
        console.log(chalk.dim('Make sure the database exists and migrations have been run.'));
      }
    }

    console.log('');
  },

  /**
   * Create the D1 database
   */
  async create(): Promise<void> {
    console.log(chalk.bold('\n🗄️  Creating D1 Database\n'));

    const { apiDir } = getPaths();

    console.log(chalk.cyan('Creating rank-everything-db...\n'));

    const result = runWrangler(['d1', 'create', 'rank-everything-db'], apiDir);

    if (result.success) {
      console.log(chalk.green('\n✅ Database created!'));
      console.log(
        chalk.yellow('\n⚠️  Copy the database_id from above into apps/api/wrangler.toml')
      );
    } else {
      console.log(chalk.yellow('\nDatabase may already exist, or you need to login first:'));
      console.log(chalk.dim('  npx wrangler login'));
    }

    console.log('');
  },
};
