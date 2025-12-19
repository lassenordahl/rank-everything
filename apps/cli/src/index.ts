#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { config } from 'dotenv';

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

const program = new Command();

program
  .name('rank')
  .description('CLI for Rank Everything development')
  .version('0.1.0');

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
