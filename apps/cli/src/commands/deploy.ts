import chalk from 'chalk';
import ora from 'ora';
import { spawnSync, execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface DeployOptions {
  preview?: boolean;
  prod?: boolean;
}

interface StatusOptions {
  logs?: boolean;
}

// Get paths
function getPaths() {
  const cliDir = resolve(__dirname, '../..');
  const rootDir = resolve(cliDir, '../..');
  const apiDir = resolve(rootDir, 'apps/api');
  const webDir = resolve(rootDir, 'apps/web');
  return { cliDir, rootDir, apiDir, webDir };
}

// Run a command and stream output
function runCommand(command: string, args: string[], cwd: string): boolean {
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    shell: true,
  });
  return result.status === 0;
}

export const deployCommands = {
  async deploy(target: string | undefined, options: DeployOptions): Promise<void> {
    console.log(chalk.bold('\n🚀 Deploying to Cloudflare\n'));

    const { apiDir, webDir } = getPaths();
    const deployTarget = target || 'all';
    const isProd = options.prod === true;
    const env = isProd ? 'production' : 'preview';

    console.log(`Target: ${chalk.cyan(deployTarget)}`);
    console.log(`Environment: ${chalk.cyan(env)}`);
    console.log('');

    // Check if logged in
    try {
      execSync('npx wrangler whoami', { cwd: apiDir, stdio: 'pipe' });
    } catch {
      console.log(chalk.red('Not logged in to Cloudflare.'));
      console.log(chalk.dim('\nRun: npx wrangler login\n'));
      return;
    }

    const targets = deployTarget === 'all' ? ['api', 'web'] : [deployTarget];
    let allSucceeded = true;

    for (const t of targets) {
      if (t === 'api') {
        console.log(chalk.cyan('\n📡 Deploying API (PartyKit)...\n'));

        // Deploy PartyKit
        const partySuccess = runCommand('npx', ['partykit', 'deploy'], apiDir);

        if (partySuccess) {
          console.log(chalk.green('\n✅ API deployed!\n'));
        } else {
          console.log(chalk.red('\n❌ API deployment failed\n'));
          allSucceeded = false;
        }
      } else if (t === 'web') {
        console.log(chalk.cyan('\n🌐 Deploying Web (Cloudflare Pages)...\n'));

        // Build web first
        const buildSpinner = ora('Building web app...').start();
        try {
          execSync('pnpm build', { cwd: webDir, stdio: 'pipe' });
          buildSpinner.succeed('Web app built');
        } catch {
          buildSpinner.fail('Build failed');
          allSucceeded = false;
          continue;
        }

        // Deploy to Pages
        const pagesArgs = [
          'wrangler',
          'pages',
          'deploy',
          'dist',
          '--project-name',
          'rank-everything',
        ];
        if (!isProd) {
          pagesArgs.push('--branch', 'preview');
        }

        const pagesSuccess = runCommand('npx', pagesArgs, webDir);

        if (pagesSuccess) {
          console.log(chalk.green('\n✅ Web deployed!\n'));
        } else {
          console.log(chalk.red('\n❌ Web deployment failed\n'));
          allSucceeded = false;
        }
      }
    }

    if (allSucceeded) {
      console.log(chalk.green.bold('🎉 Deployment complete!\n'));

      if (isProd) {
        console.log('Production URLs:');
        console.log(chalk.cyan('  Web: https://rank-everything.pages.dev'));
        console.log(chalk.cyan('  API: https://rank-everything.partykit.dev'));
      } else {
        console.log('Preview deployment complete. Check output above for URLs.');
      }
    } else {
      console.log(chalk.yellow('\n⚠️  Some deployments failed. Check output above.\n'));
    }

    console.log('');
  },

  async status(options: StatusOptions): Promise<void> {
    console.log(chalk.bold('\n📊 Deployment Status\n'));

    const { apiDir } = getPaths();

    // Check wrangler auth
    console.log(chalk.cyan('Checking Cloudflare authentication...\n'));

    try {
      execSync('npx wrangler whoami', { cwd: apiDir, stdio: 'inherit' });
    } catch {
      console.log(chalk.red('\nNot logged in to Cloudflare.'));
      console.log(chalk.dim('Run: npx wrangler login\n'));
      return;
    }

    if (options.logs) {
      console.log(chalk.cyan('\nRecent deployment logs:\n'));
      console.log(chalk.dim('(Use wrangler tail for live logs)\n'));
    }

    console.log('');
  },

  // Quick setup for first-time deployment
  async setup(): Promise<void> {
    console.log(chalk.bold('\n⚙️  First-Time Deployment Setup\n'));

    const { apiDir } = getPaths();

    console.log('This will set up your Cloudflare resources for deployment.\n');

    // Step 1: Login
    console.log(chalk.cyan('Step 1: Cloudflare Login\n'));
    runCommand('npx', ['wrangler', 'login'], apiDir);

    // Step 2: Create D1 database
    console.log(chalk.cyan('\nStep 2: Create D1 Database\n'));
    runCommand('npx', ['wrangler', 'd1', 'create', 'rank-everything-db'], apiDir);

    console.log(chalk.yellow('\n⚠️  Copy the database_id from above into apps/api/wrangler.toml'));

    // Step 3: Create KV namespace
    console.log(chalk.cyan('\nStep 3: Create KV Namespace\n'));
    runCommand('npx', ['wrangler', 'kv:namespace', 'create', 'ROOM_CACHE'], apiDir);

    console.log(chalk.yellow('\n⚠️  Copy the namespace id from above into apps/api/wrangler.toml'));

    // Step 4: Set secrets
    console.log(chalk.cyan('\nStep 4: Set Secrets\n'));
    console.log('Run the following command and paste your API key when prompted:');
    console.log(chalk.dim('  cd apps/api && npx wrangler secret put ANTHROPIC_API_KEY'));

    console.log(chalk.green('\n✅ Setup instructions complete!'));
    console.log(chalk.dim('\nAfter updating wrangler.toml, run:'));
    console.log(chalk.dim('  pnpm rank db migrate --remote'));
    console.log(chalk.dim('  pnpm rank deploy --prod\n'));
  },
};
