import chalk from 'chalk';
import { spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface DevOptions {
  apiOnly?: boolean;
  webOnly?: boolean;
}

// Get paths
function getPaths() {
  const cliDir = resolve(__dirname, '../..');
  const rootDir = resolve(cliDir, '../..');
  const apiDir = resolve(rootDir, 'apps/api');
  const webDir = resolve(rootDir, 'apps/web');
  return { cliDir, rootDir, apiDir, webDir };
}

export async function devCommand(options: DevOptions): Promise<void> {
  console.log(chalk.bold('\n🎮 Rank Everything - Development Mode\n'));

  const { apiDir, webDir } = getPaths();
  const processes: ReturnType<typeof spawn>[] = [];

  if (options.apiOnly) {
    console.log(chalk.cyan('Starting API server only...\n'));
    console.log('  📡 PartyKit: http://localhost:1999');
    console.log('');
    startService('partykit', ['dev'], apiDir, processes);
    startService('wrangler', ['dev'], apiDir, processes);
  } else if (options.webOnly) {
    console.log(chalk.cyan('Starting web frontend only...\n'));
    console.log('  🌐 Web: http://localhost:5173');
    console.log('');
    startService('vite', [], webDir, processes);
  } else {
    console.log(chalk.cyan('Starting all services...\n'));
    console.log('  📡 PartyKit: http://localhost:1999');
    console.log('  👷 API:      http://localhost:8787');
    console.log('  🌐 Web:      http://localhost:5173');
    console.log('');
    console.log(chalk.dim('Press Ctrl+C to stop all services\n'));

    // Start PartyKit and Worker
    startService('partykit', ['dev'], apiDir, processes, 'PARTY');
    startService('wrangler', ['dev'], apiDir, processes, 'API');

    // Small delay then start web
    await new Promise((resolve) => setTimeout(resolve, 1000));
    startService('vite', [], webDir, processes, 'WEB');
  }

  // Handle cleanup on exit
  const cleanup = () => {
    console.log(chalk.dim('\n\nShutting down services...'));
    processes.forEach((proc) => {
      try {
        proc.kill('SIGTERM');
      } catch {
        // Process may already be dead
      }
    });
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

function startService(
  command: string,
  args: string[],
  cwd: string,
  processes: ReturnType<typeof spawn>[],
  prefix?: string
): void {
  const proc = spawn('npx', [command, ...args], {
    cwd,
    stdio: prefix ? 'pipe' : 'inherit',
    shell: true,
  });

  processes.push(proc);

  if (prefix && proc.stdout && proc.stderr) {
    proc.stdout.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n').filter(Boolean);
      lines.forEach((line) => {
        console.log(chalk.dim(`[${prefix}]`), line);
      });
    });

    proc.stderr.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n').filter(Boolean);
      lines.forEach((line) => {
        console.log(chalk.dim(`[${prefix}]`), chalk.yellow(line));
      });
    });
  }

  proc.on('error', (error) => {
    console.error(chalk.red(`Failed to start ${command}:`), error.message);
  });

  proc.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.log(chalk.red(`${command} exited with code ${code}`));
    }
  });
}
