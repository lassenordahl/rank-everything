import chalk from 'chalk';
import ora from 'ora';
import { execSync, spawnSync } from 'child_process';
import { resolve, dirname } from 'path';
import { existsSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface MigrateOptions {
  status?: boolean;
  rollback?: boolean;
  local?: boolean;
  remote?: boolean;
}

interface SeedOptions {
  items?: string;
  scenario?: string;
  local?: boolean;
  remote?: boolean;
}

interface ResetOptions {
  seed?: boolean;
  local?: boolean;
  remote?: boolean;
}

interface InspectOptions {
  json?: boolean;
  local?: boolean;
  remote?: boolean;
}

// Get paths
function getPaths() {
  const cliDir = resolve(__dirname, '../..');
  const rootDir = resolve(cliDir, '../..');
  const apiDir = resolve(rootDir, 'apps/api');
  const migrationsDir = resolve(rootDir, 'packages/db-schema/migrations');
  return { cliDir, rootDir, apiDir, migrationsDir };
}

// Run wrangler command
function runWrangler(args: string[], cwd: string, silent = false): { success: boolean; output: string } {
  try {
    const result = spawnSync('npx', ['wrangler', ...args], {
      cwd,
      encoding: 'utf-8',
      stdio: silent ? 'pipe' : 'inherit',
    });
    return { success: result.status === 0, output: result.stdout || '' };
  } catch (error) {
    return { success: false, output: String(error) };
  }
}

export const dbCommands = {
  async migrate(options: MigrateOptions): Promise<void> {
    console.log(chalk.bold('\n📦 Database Migrations\n'));

    const { apiDir, migrationsDir } = getPaths();
    const isLocal = options.local !== false && !options.remote;
    const target = isLocal ? '--local' : '--remote';

    if (options.status) {
      console.log(chalk.cyan(`Checking migration status (${isLocal ? 'local' : 'remote'})...\n`));

      // List tables to show what exists
      const result = runWrangler(
        ['d1', 'execute', 'rank-everything-db', target, '--command', "SELECT name FROM sqlite_master WHERE type='table'"],
        apiDir,
        true
      );

      if (result.success) {
        console.log(chalk.green('Database tables:'));
        console.log(result.output || '  (run migrations to create tables)');
      } else {
        console.log(chalk.yellow('Could not check status. Database may not exist yet.'));
        console.log(chalk.dim('\nTo create the database:'));
        console.log(chalk.dim('  npx wrangler d1 create rank-everything-db'));
      }
      return;
    }

    // Check if migrations directory exists
    if (!existsSync(migrationsDir)) {
      console.log(chalk.red('Migrations directory not found'));
      return;
    }

    // Get migration files
    const migrationFiles = readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    if (migrationFiles.length === 0) {
      console.log(chalk.yellow('No migration files found'));
      return;
    }

    console.log(chalk.cyan(`Running ${migrationFiles.length} migrations (${isLocal ? 'local' : 'remote'})...\n`));

    for (const file of migrationFiles) {
      const spinner = ora(`Running ${file}...`).start();
      const filePath = resolve(migrationsDir, file);

      const result = runWrangler(
        ['d1', 'execute', 'rank-everything-db', target, '--file', filePath],
        apiDir,
        true
      );

      if (result.success) {
        spinner.succeed(`${file}`);
      } else {
        spinner.fail(`${file} - ${result.output}`);
        if (!result.output.includes('already exists')) {
          console.log(chalk.red('\nMigration failed. Stopping.'));
          return;
        }
      }
    }

    console.log(chalk.green('\n✅ Migrations complete!\n'));
  },

  async seed(options: SeedOptions): Promise<void> {
    console.log(chalk.bold('\n🌱 Seeding Database\n'));

    const { apiDir, migrationsDir } = getPaths();
    const isLocal = options.local !== false && !options.remote;
    const target = isLocal ? '--local' : '--remote';

    const seedFile = resolve(migrationsDir, '002_seed.sql');

    if (!existsSync(seedFile)) {
      console.log(chalk.red('Seed file not found: 002_seed.sql'));
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
    } else {
      spinner.warn('Seed may have already been applied (duplicates ignored)');
    }

    console.log('');
  },

  async reset(options: ResetOptions): Promise<void> {
    console.log(chalk.bold('\n🗑️  Resetting Database\n'));

    const { apiDir, migrationsDir } = getPaths();
    const isLocal = options.local !== false && !options.remote;
    const target = isLocal ? '--local' : '--remote';

    console.log(chalk.yellow(`This will reset the ${isLocal ? 'local' : 'remote'} database.\n`));

    // Drop tables
    const dropSpinner = ora('Dropping tables...').start();

    const dropResult = runWrangler(
      ['d1', 'execute', 'rank-everything-db', target, '--command',
        'DROP TABLE IF EXISTS global_items; DROP TABLE IF EXISTS emoji_usage; DROP TABLE IF EXISTS daily_challenges;'],
      apiDir,
      true
    );

    if (dropResult.success) {
      dropSpinner.succeed('Tables dropped');
    } else {
      dropSpinner.fail('Failed to drop tables');
    }

    // Re-run migrations
    console.log('');
    await this.migrate({ local: isLocal, remote: !isLocal });

    // Optionally seed
    if (options.seed) {
      await this.seed({ local: isLocal, remote: !isLocal });
    }
  },

  async inspect(table: string | undefined, options: InspectOptions): Promise<void> {
    console.log(chalk.bold('\n🔍 Database Inspection\n'));

    const { apiDir } = getPaths();
    const isLocal = options.local !== false && !options.remote;
    const target = isLocal ? '--local' : '--remote';

    let query: string;

    if (table) {
      query = `SELECT * FROM ${table} LIMIT 20`;
      console.log(chalk.cyan(`Inspecting table: ${table}\n`));
    } else {
      query = "SELECT name, type FROM sqlite_master WHERE type IN ('table', 'index') ORDER BY type, name";
      console.log(chalk.cyan('Database schema:\n'));
    }

    const result = runWrangler(
      ['d1', 'execute', 'rank-everything-db', target, '--command', query],
      apiDir
    );

    if (!result.success) {
      console.log(chalk.red('\nFailed to inspect database.'));
      console.log(chalk.dim('Make sure the database exists and migrations have been run.'));
    }

    console.log('');
  },

  // Helper to create the database
  async create(): Promise<void> {
    console.log(chalk.bold('\n🗄️  Creating D1 Database\n'));

    const { apiDir } = getPaths();

    console.log(chalk.cyan('Creating rank-everything-db...\n'));

    const result = runWrangler(['d1', 'create', 'rank-everything-db'], apiDir);

    if (result.success) {
      console.log(chalk.green('\n✅ Database created!'));
      console.log(chalk.yellow('\n⚠️  Copy the database_id from above into apps/api/wrangler.toml'));
    } else {
      console.log(chalk.yellow('\nDatabase may already exist, or you need to login first:'));
      console.log(chalk.dim('  npx wrangler login'));
    }

    console.log('');
  },
};
