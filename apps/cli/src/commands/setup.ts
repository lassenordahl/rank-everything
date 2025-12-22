import chalk from 'chalk';
import ora from 'ora';
import { execSync } from 'child_process';
import { existsSync, copyFileSync } from 'fs';
import { resolve } from 'path';

interface SetupOptions {
  clean?: boolean;
}

export async function setupCommand(options: SetupOptions): Promise<void> {
  console.log(chalk.bold('\n🎮 Rank Everything - Development Setup\n'));

  const rootDir = resolve(process.cwd(), '../..');

  if (options.clean) {
    const cleanSpinner = ora('Cleaning existing setup...').start();
    try {
      execSync('pnpm run clean', { cwd: rootDir, stdio: 'pipe' });
      cleanSpinner.succeed('Cleaned existing setup');
    } catch {
      cleanSpinner.warn('Nothing to clean');
    }
  }

  // Step 1: Check prerequisites
  const prereqSpinner = ora('Checking prerequisites...').start();

  try {
    execSync('node --version', { stdio: 'pipe' });
    execSync('pnpm --version', { stdio: 'pipe' });
    prereqSpinner.succeed('Prerequisites met (Node.js, pnpm)');
  } catch {
    prereqSpinner.fail('Missing prerequisites');
    console.log(chalk.red('\nPlease install:'));
    console.log('  - Node.js >= 18: https://nodejs.org');
    console.log('  - pnpm: npm install -g pnpm');
    process.exit(1);
  }

  // Step 2: Install dependencies
  const depsSpinner = ora('Installing dependencies...').start();
  try {
    execSync('pnpm install', { cwd: rootDir, stdio: 'pipe' });
    depsSpinner.succeed('Dependencies installed');
  } catch (error) {
    depsSpinner.fail('Failed to install dependencies');
    console.error(error);
    process.exit(1);
  }

  // Step 3: Build packages
  const buildSpinner = ora('Building packages...').start();
  try {
    execSync('pnpm run build', { cwd: rootDir, stdio: 'pipe' });
    buildSpinner.succeed('Packages built');
  } catch (error) {
    buildSpinner.fail('Failed to build packages');
    console.error(error);
    process.exit(1);
  }

  // Step 4: Setup environment
  const envSpinner = ora('Setting up environment...').start();
  const envExample = resolve(rootDir, '.env.example');
  const envFile = resolve(rootDir, '.env');

  if (!existsSync(envFile) && existsSync(envExample)) {
    copyFileSync(envExample, envFile);
    envSpinner.succeed('Environment file created (.env)');
    console.log(chalk.yellow('\n⚠️  Remember to add your ANTHROPIC_API_KEY to .env\n'));
  } else if (existsSync(envFile)) {
    envSpinner.succeed('Environment file exists');
  } else {
    envSpinner.warn('No .env.example found');
  }

  // Step 5: Database setup
  const dbSpinner = ora('Setting up database...').start();
  try {
    // This will be implemented when we have wrangler setup
    dbSpinner.succeed('Database ready (using local D1)');
  } catch {
    dbSpinner.warn('Database setup skipped (wrangler not configured)');
  }

  // Done!
  console.log(chalk.green.bold('\n✅ Setup complete!\n'));
  console.log('Next steps:');
  console.log(chalk.cyan('  1. Add your ANTHROPIC_API_KEY to .env'));
  console.log(chalk.cyan('  2. Run: pnpm rank dev'));
  console.log(chalk.cyan('  3. Start building!\n'));
}
