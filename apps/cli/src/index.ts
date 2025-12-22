#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { config } from 'dotenv';

// Handle Ctrl+C immediately
process.on('SIGINT', () => {
  process.exit(0);
});

// Load environment variables
config({ path: '../../.env' });

// Import commands
import { setupCommand } from './commands/setup.js';
import { devCommand } from './commands/dev.js';
import { dbCommands } from './commands/db.js';
import { testCommands } from './commands/test.js';
import { roomCommands } from './commands/room.js';
import { deployCommands } from './commands/deploy.js';
import { docsCommand } from './commands/docs.js';
import { dashboardCommand } from './commands/dashboard.js';
import { logsCommands } from './commands/logs.js';
import { itemsCommands } from './commands/items.js';

const program = new Command();

program.name('rank').description('CLI for Rank Everything development').version('0.1.0');

// Setup command
program
  .command('setup')
  .description('Initialize development environment')
  .option('--clean', 'Wipe everything first, then setup')
  .action(setupCommand);

// Dev command
program
  .command('dev')
  .description('Start local development environment')
  .option('--api-only', 'Start only API server')
  .option('--web-only', 'Start only web frontend')
  .action(devCommand);

// Database commands
const db = program.command('db').description('Database management');

db.command('create')
  .description('Create the D1 database (requires wrangler login)')
  .action(dbCommands.create);

db.command('migrate')
  .description('Run database migrations')
  .option('--status', 'Show migration status')
  .option('--local', 'Run on local database (default)')
  .option('--remote', 'Run on remote/production database')
  .action(dbCommands.migrate);

db.command('migrate:create')
  .description('Create a new migration file')
  .argument('<name>', 'Migration name (e.g., "add users table")')
  .action(dbCommands.createMigration);

db.command('seed')
  .description('Seed database with test data')
  .option('--local', 'Seed local database (default)')
  .option('--remote', 'Seed remote/production database')
  .action(dbCommands.seed);

db.command('reset')
  .description('Reset database to clean state')
  .option('--seed', 'Also seed with test data')
  .option('--local', 'Reset local database (default)')
  .option('--remote', 'Reset remote/production database')
  .option('--force', 'Force reset (required for remote)')
  .action(dbCommands.reset);

db.command('inspect')
  .description('Inspect current database state')
  .argument('[table]', 'Table to inspect')
  .option('--json', 'Output as JSON')
  .option('--local', 'Inspect local database (default)')
  .option('--remote', 'Inspect remote/production database')
  .action(dbCommands.inspect);

// Test commands
program
  .command('test')
  .description('Run test suites')
  .argument('[suite]', 'Test suite to run (unit, integration, e2e)')
  .option('--watch', 'Watch mode')
  .option('--coverage', 'Generate coverage report')
  .option('--filter <pattern>', 'Filter tests by name')
  .option('--json', 'Output as JSON')
  .action(testCommands.run);

program
  .command('test:spec')
  .description('Run spec compliance tests')
  .argument('[feature]', 'Feature to test')
  .option('--report', 'Generate spec compliance report')
  .action(testCommands.spec);

program
  .command('test:e2e')
  .description('Run E2E tests with Playwright')
  .option('--watch', 'Run in UI mode')
  .action((options) => testCommands.run('e2e', options));

// Room commands
const room = program.command('room').description('Room management for testing');

room
  .command('create')
  .description('Create a test room')
  .option('--players <count>', 'Number of bot players', '4')
  .option('--mode <mode>', 'Submission mode (round-robin, host-only)', 'round-robin')
  .option('--timer <seconds>', 'Timer duration (0 to disable)', '60')
  .option('--started', 'Create and start game immediately')
  .option('--json', 'Output as JSON')
  .action(roomCommands.create);

room
  .command('simulate')
  .description('Simulate a full game session')
  .option('--players <count>', 'Number of players', '4')
  .option('--speed <speed>', 'Simulation speed (fast, realtime)', 'fast')
  .option('--output <file>', 'Save game log to file')
  .action(roomCommands.simulate);

room
  .command('state')
  .description('Get current state of a room')
  .argument('<code>', 'Room code')
  .option('--watch', 'Watch for changes')
  .option('--json', 'Output as JSON')
  .action(roomCommands.state);

// Deploy commands
program
  .command('deploy')
  .description('Deploy to Cloudflare')
  .argument('[target]', 'Deployment target (api, web, all)')
  .option('--preview', 'Deploy to preview environment')
  .option('--prod', 'Deploy to production')
  .action(deployCommands.deploy);

program
  .command('deploy:status')
  .description('Check deployment status')
  .option('--logs', 'Show recent deployment logs')
  .action(deployCommands.status);

program
  .command('deploy:setup')
  .description('First-time setup for Cloudflare deployment')
  .action(deployCommands.setup);

// Docs command
program
  .command('docs')
  .description('Open documentation')
  .argument('[doc]', 'Document to open (cli, api, spec)')
  .action(docsCommand);

// Dashboard command
program
  .command('dashboard')
  .description('Open interactive dashboard')
  .option('--local', 'Use local database (default)')
  .option('--remote', 'Use remote database')
  .option('--prod', 'Use production database')
  .action(dashboardCommand);

// Logs commands
const logs = program.command('logs').description('Query client error logs');

logs
  .command('list')
  .description('List recent error logs')
  .option('--limit <count>', 'Number of logs to fetch', '50')
  .option('--level <level>', 'Filter by level (error, warn, info)')
  .option('--type <type>', 'Filter by error type')
  .option('--local', 'Query local database (default)')
  .option('--remote', 'Query remote/production database')
  .action(logsCommands.list);

logs
  .command('search')
  .description('Search logs by message')
  .argument('<query>', 'Search query')
  .option('--limit <count>', 'Max results', '50')
  .option('--local', 'Query local database (default)')
  .option('--remote', 'Query remote/production database')
  .action(logsCommands.search);

logs
  .command('session')
  .description('View all logs for a session')
  .argument('<sessionId>', 'Session ID')
  .option('--local', 'Query local database (default)')
  .option('--remote', 'Query remote/production database')
  .action(logsCommands.session);

logs
  .command('clear')
  .description('Clear old logs')
  .option('--days <days>', 'Keep logs from last N days', '7')
  .option('--force', 'Skip confirmation')
  .option('--local', 'Clear local database (default)')
  .option('--remote', 'Clear remote/production database')
  .action(logsCommands.clear);

// Items commands
const items = program.command('items').description('Manage global items pool');

items
  .command('list')
  .description('List global items')
  .option('--limit <count>', 'Number of items to show', '50')
  .option('--search <query>', 'Filter by text')
  .option('--json', 'Output as JSON')
  .option('--local', 'Use local database (default)')
  .option('--remote', 'Use remote/production database')
  .action(itemsCommands.list);

items
  .command('add')
  .description('Add item to global pool')
  .argument('<text>', 'Item text')
  .argument('<emoji>', 'Item emoji')
  .option('--local', 'Use local database (default)')
  .option('--remote', 'Use remote/production database')
  .action(itemsCommands.add);

// Version with all packages
program
  .command('version')
  .description('Show version info')
  .option('--all', 'Show all package versions')
  .action((options) => {
    console.log(chalk.bold('rank-everything CLI v0.1.0'));
    if (options.all) {
      console.log('\nPackage versions:');
      console.log('  @rank-everything/cli: 0.1.0');
      console.log('  @rank-everything/shared-types: 0.1.0');
      console.log('  @rank-everything/db-schema: 0.1.0');
    }
  });

// Parse and run
program.parse();
