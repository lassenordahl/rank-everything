import chalk from 'chalk';
import ora from 'ora';
import { runWrangler } from '../lib/db-executor.js';
import { getPaths } from '../lib/paths.js';

interface ListOptions {
  limit?: string;
  search?: string;
  local?: boolean;
  remote?: boolean;
  json?: boolean;
}

interface AddOptions {
  local?: boolean;
  remote?: boolean;
}

interface ItemRow {
  id: string;
  text: string;
  emoji: string;
  created_at: number;
}

export const itemsCommands = {
  /**
   * List global items
   */
  async list(options: ListOptions): Promise<void> {
    const { apiDir } = getPaths();
    const isLocal = options.local !== false && !options.remote;
    const target = isLocal ? '--local' : '--remote';
    const limit = parseInt(options.limit || '50', 10);

    if (!options.json) {
      console.log(chalk.bold(`\n📋 Global Items (${isLocal ? 'local' : 'remote'})\n`));
    }

    let query = 'SELECT id, text, emoji, created_at FROM global_items';

    if (options.search) {
      const safeSearch = options.search.replace(/'/g, "''");
      query += ` WHERE text LIKE '%${safeSearch}%'`;
    }

    query += ` ORDER BY created_at DESC LIMIT ${limit}`;

    // Always get JSON for parsing
    const args = ['d1', 'execute', 'rank-everything-db', target, '--command', query, '--json'];

    const spinner = options.json ? null : ora('Fetching items...').start();

    const result = runWrangler(args, apiDir, true);

    if (result.success) {
      if (spinner) spinner.stop();

      if (options.json) {
        console.log(result.output);
      } else {
        // Parse JSON and display as table
        try {
          const parsed = JSON.parse(result.output || '[]');
          const rows: ItemRow[] = parsed[0]?.results || [];

          if (rows.length === 0) {
            console.log(chalk.yellow('  No items found.\n'));
            return;
          }

          // Calculate column widths
          const maxTextLen = Math.min(60, Math.max(...rows.map((r) => r.text.length), 4));

          // Print header
          console.log(
            chalk.dim('  ') +
              chalk.bold.cyan('Emoji') +
              '  ' +
              chalk.bold.cyan('Text'.padEnd(maxTextLen)) +
              '  ' +
              chalk.bold.cyan('Created')
          );
          console.log(chalk.dim('  ' + '─'.repeat(maxTextLen + 25)));

          // Print rows
          for (const row of rows) {
            const date = new Date(row.created_at).toLocaleDateString();
            const text =
              row.text.length > maxTextLen
                ? row.text.slice(0, maxTextLen - 3) + '...'
                : row.text.padEnd(maxTextLen);

            console.log('  ' + row.emoji.padEnd(6) + ' ' + text + '  ' + chalk.dim(date));
          }

          console.log(chalk.dim(`\n  Showing ${rows.length} item(s)\n`));
        } catch {
          // Fallback to raw output
          console.log(result.output);
        }
      }
    } else {
      if (spinner) spinner.fail('Failed to fetch items');
      console.log(chalk.red(result.error || result.output));
    }
  },

  /**
   * Add a new item to the global pool
   */
  async add(text: string, emoji: string, options: AddOptions): Promise<void> {
    const { apiDir } = getPaths();
    const isLocal = options.local !== false && !options.remote;
    const target = isLocal ? '--local' : '--remote';

    console.log(chalk.bold(`\n➕ Adding Item (${isLocal ? 'local' : 'remote'})\n`));

    const id = `cli_${Date.now()}`;
    const safeText = text.replace(/'/g, "''");
    const safeEmoji = emoji.replace(/'/g, "''");

    const query = `INSERT INTO global_items (id, text, emoji, created_at) VALUES ('${id}', '${safeText}', '${safeEmoji}', ${Date.now()})`;

    const spinner = ora('Adding item...').start();

    const result = runWrangler(
      ['d1', 'execute', 'rank-everything-db', target, '--command', query],
      apiDir,
      true
    );

    if (result.success) {
      spinner.succeed(`Added item: ${emoji} ${text}`);
    } else {
      spinner.fail('Failed to add item');
      console.log(chalk.red(result.error || result.output));
    }
    console.log('');
  },
};
