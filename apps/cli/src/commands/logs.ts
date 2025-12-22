import chalk from 'chalk';
import { getWorkerUrl } from '../utils/config.js';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import ora from 'ora';
import prompts from 'prompts';
import { createWranglerExecutor } from '../lib/db-executor.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function getPaths() {
  const cliDir = resolve(__dirname, '../..');
  const rootDir = resolve(cliDir, '../..');
  const apiDir = resolve(rootDir, 'apps/api');
  return { apiDir };
}

interface LogOptions {
  limit?: string;
  level?: string;
  type?: string;
  local?: boolean;
  remote?: boolean;
}

interface SearchOptions {
  limit?: string;
  local?: boolean;
  remote?: boolean;
}

interface ClearOptions {
  days: string;
  force?: boolean;
  local?: boolean;
  remote?: boolean;
}

interface ClientLog {
  id: string;
  sessionId: string;
  timestamp: number;
  level: string; // 'error' | 'warn' | 'info'
  type: string;
  message: string;
  stack?: string;
  componentStack?: string;
  context?: Record<string, unknown>;
  userAgent: string;
  roomCode?: string;
  url: string;
  createdAt: number;
}

async function fetchLogs(
  endpoint: string,
  params: URLSearchParams,
  isRemote: boolean
): Promise<ClientLog[]> {
  const baseUrl = await getWorkerUrl(isRemote);
  const url = `${baseUrl}${endpoint}?${params.toString()}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch logs: ${response.statusText}`);
    }
    const data = (await response.json()) as { logs?: ClientLog[]; error?: string };
    if (data.error) {
      throw new Error(data.error);
    }
    return data.logs || [];
  } catch (error) {
    console.error(
      chalk.red('Error reaching API:'),
      error instanceof Error ? error.message : String(error)
    );
    if (!isRemote) {
      console.log(chalk.yellow('Make sure the local API server is running (pnpm dev:api)'));
    }
    return [];
  }
}

function formatLog(log: ClientLog) {
  const date = new Date(log.timestamp).toLocaleTimeString();

  let levelColor = chalk.white;
  if (log.level === 'error') levelColor = chalk.red.bold;
  else if (log.level === 'warn') levelColor = chalk.yellow.bold;
  else if (log.level === 'info') levelColor = chalk.blue.bold;

  console.log(
    chalk.gray(`[${date}]`),
    levelColor(log.level.toUpperCase().padEnd(5)),
    chalk.cyan(log.type.padEnd(20)),
    log.message
  );

  if (log.roomCode) {
    console.log(
      chalk.gray(`         Room: ${log.roomCode} | Session: ${log.sessionId.substring(0, 8)}...`)
    );
  } else {
    console.log(chalk.gray(`         Session: ${log.sessionId.substring(0, 8)}...`));
  }

  // Show stack trace for errors if available (truncated)
  if (log.stack) {
    const stackLines = log.stack.split('\n').slice(0, 3);
    console.log(chalk.gray('         Stack:'));
    stackLines.forEach((line) => console.log(chalk.gray(`           ${line.trim()}`)));
  }
}

export const logsCommands = {
  async list(options: LogOptions) {
    const isRemote = !!options.remote;
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', options.limit);
    if (options.level) params.set('level', options.level);
    if (options.type) params.set('type', options.type);

    console.log(chalk.blue(`Fetching logs from ${isRemote ? 'remote' : 'local'}...`));

    const logs = await fetchLogs('/api/logs', params, isRemote);

    if (logs.length === 0) {
      console.log(chalk.yellow('No logs found matching criteria.'));
      return;
    }

    console.log(chalk.bold(`Found ${logs.length} logs:\n`));
    logs.reverse().forEach(formatLog); // Show oldest first
  },

  async search(query: string, options: SearchOptions) {
    const isRemote = !!options.remote;
    const params = new URLSearchParams();
    params.set('search', query);
    if (options.limit) params.set('limit', options.limit);

    console.log(
      chalk.blue(`Searching logs for "${query}" from ${isRemote ? 'remote' : 'local'}...`)
    );

    const logs = await fetchLogs('/api/logs', params, isRemote);

    if (logs.length === 0) {
      console.log(chalk.yellow('No logs found matching query.'));
      return;
    }

    console.log(chalk.bold(`Found ${logs.length} matching logs:\n`));
    logs.reverse().forEach(formatLog);
  },

  async session(sessionId: string, options: SearchOptions) {
    const isRemote = !!options.remote;
    const params = new URLSearchParams();
    params.set('session', sessionId);
    params.set('limit', '100'); // Higher limit for session view

    console.log(
      chalk.blue(`Fetching session ${sessionId} logs from ${isRemote ? 'remote' : 'local'}...`)
    );

    const logs = await fetchLogs('/api/logs', params, isRemote);

    if (logs.length === 0) {
      console.log(chalk.yellow('No logs found for this session.'));
      return;
    }

    const firstLog = logs[0]; // Recent log
    console.log(chalk.bold.underline(`\nSession Details`));
    console.log(`ID: ${firstLog.sessionId}`);
    console.log(`User Agent: ${firstLog.userAgent}`);
    console.log(`Last Seen: ${new Date(firstLog.timestamp).toLocaleString()}\n`);

    console.log(chalk.bold(`Event Timeline:\n`));
    logs.reverse().forEach(formatLog);

    // Check for crash patterns
    const reloadEvents = logs.filter((l) => l.message.includes('Session started'));
    if (reloadEvents.length > 1) {
      console.log(
        chalk.red.bold('\n⚠️  Multiple session starts detected - likely page crash/reload!')
      );
    }
  },

  async clear(options: ClearOptions) {
    const days = parseInt(options.days, 10);
    const isRemote = !!options.remote;
    const isLocal = options.local !== false && !isRemote;

    if (isNaN(days) || days < 0) {
      console.log(chalk.red('Invalid days parameter. Must be a non-negative integer.'));
      return;
    }

    const { apiDir } = getPaths();
    const target = isRemote ? 'remote' : 'local';

    if (!options.force) {
      const response = await prompts({
        type: 'confirm',
        name: 'value',
        message: `Are you sure you want to delete logs older than ${days} days from ${target} DB?`,
        initial: false,
      });

      if (!response.value) {
        console.log(chalk.yellow('Operation cancelled.'));
        return;
      }
    }

    const spinner = ora(`Clearing logs older than ${days} days (${target})...`).start();

    const executor = createWranglerExecutor(apiDir, isLocal);

    // Calculate cutoff timestamp
    const msPerDay = 24 * 60 * 60 * 1000;
    const cutoff = Date.now() - days * msPerDay;

    const query = `DELETE FROM client_logs WHERE timestamp < ${cutoff}`;

    try {
      const result = await executor.execute(query);
      if (result.success) {
        spinner.succeed('Logs cleared successfully.');
      } else {
        spinner.fail('Failed to clear logs.');
        console.error(chalk.red(result.error));
      }
    } catch (error) {
      spinner.fail('Failed to clear logs.');
      console.error(chalk.red(String(error)));
    }
  },
};
