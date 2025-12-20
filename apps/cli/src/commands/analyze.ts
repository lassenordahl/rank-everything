
import chalk from 'chalk';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { createWranglerExecutor } from '../lib/db-executor.js';
import { DashboardService } from '../lib/dashboard-service.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface AnalyzeOptions {
  local?: boolean;
  remote?: boolean;
  prod?: boolean;
  json?: boolean;
}

export const analyzeCommand = async (options: AnalyzeOptions) => {
  const isLocal = options.local !== false && !options.remote && !options.prod;

  // Resolve paths
  const cliDir = resolve(__dirname, '../..');
  const rootDir = resolve(cliDir, '../..');
  const apiDir = resolve(rootDir, 'apps/api');

  const executor = createWranglerExecutor(apiDir, isLocal);
  const service = new DashboardService(executor, isLocal);

  if (!options.json) {
    console.log(chalk.bold(`\n📊 System Analysis (${isLocal ? 'Local' : 'Remote'})\n`));
  }

  try {
    const status = await service.getSystemStatus();

    if (options.json) {
      console.log(JSON.stringify(status, null, 2));
      return;
    }

    console.log(chalk.cyan('System Status:'));
    console.log(`  Database: ${status.dbConnection ? chalk.green('Connected') : chalk.red('Disconnected')}`);
    console.log('');

    console.log(chalk.cyan('Statistics:'));
    console.log(`  Total Global Items: ${chalk.bold(status.itemsCount)}`);
    console.log(`  Emoji API Usage (Today): ${chalk.bold(status.emojiUsageToday)}`);
    console.log('');

    console.log(chalk.cyan('Recent Items:'));
    if (status.recentItems.length === 0) {
      console.log(chalk.dim('  No items found'));
    } else {
      status.recentItems.forEach((item) => {
        const date = new Date(item.created_at).toLocaleString();
        console.log(`  ${item.emoji}  ${chalk.bold(item.text.padEnd(30))} ${chalk.dim(date)}`);
      });
    }
  } catch (error) {
    if (options.json) {
      console.log(JSON.stringify({ error: String(error) }));
      return;
    }
    console.error(chalk.red(`\nAn error occurred: ${error}`));
  }

  console.log('');
};
