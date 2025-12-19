import chalk from 'chalk';
import { execSync } from 'child_process';
import { resolve } from 'path';

interface TestOptions {
  watch?: boolean;
  coverage?: boolean;
  filter?: string;
  json?: boolean;
}

interface SpecOptions {
  report?: boolean;
}

export const testCommands = {
  async run(suite: string | undefined, options: TestOptions): Promise<void> {
    console.log(chalk.bold('\n🧪 Running Tests\n'));

    const rootDir = resolve(process.cwd(), '../..');

    if (suite === 'e2e') {
      console.log(chalk.cyan('Running E2E tests (Playwright)...'));
      let command = 'npm run e2e --prefix apps/web';

      if (options.watch) {
        command = 'npm run e2e:ui --prefix apps/web';
      }

      try {
        console.log(chalk.dim(`\n$ ${command}\n`));
        execSync(command, { cwd: rootDir, stdio: 'inherit' });
      } catch (e) {
        process.exit(1);
      }
      return;
    }

    let command = 'pnpm test';

    if (suite) {
      console.log(chalk.cyan(`Running ${suite} tests...`));
      command += `:${suite}`;
    } else {
      console.log(chalk.cyan('Running all tests...'));
    }

    if (options.watch) {
      command += ' --watch';
    }

    if (options.coverage) {
      command += ' --coverage';
    }

    if (options.filter) {
      command += ` --filter="${options.filter}"`;
    }

    try {
      console.log(chalk.dim(`\n$ ${command}\n`));
      execSync(command, { cwd: rootDir, stdio: 'inherit' });

      if (options.json) {
        console.log(JSON.stringify({
          status: 'passed',
          suite: suite || 'all',
          timestamp: new Date().toISOString()
        }, null, 2));
      }
    } catch (error) {
      if (options.json) {
        console.log(JSON.stringify({
          status: 'failed',
          suite: suite || 'all',
          timestamp: new Date().toISOString()
        }, null, 2));
      }
      process.exit(1);
    }
  },

  async spec(feature: string | undefined, options: SpecOptions): Promise<void> {
    console.log(chalk.bold('\n📋 Spec Compliance Tests\n'));

    const specFeatures = [
      { name: 'Feature 1', desc: 'Room Creation & Joining', status: 'pending' },
      { name: 'Feature 2', desc: 'Room Configuration', status: 'pending' },
      { name: 'Feature 3', desc: 'Gameplay Loop', status: 'pending' },
      { name: 'Feature 4', desc: 'Random Roll', status: 'pending' },
      { name: 'Feature 5', desc: 'Emoji Assignment', status: 'pending' },
      { name: 'Feature 6', desc: 'Game End & Reveal', status: 'pending' },
      { name: 'Edge Cases', desc: 'Error Handling', status: 'pending' },
      { name: 'Flow A', desc: 'Custom Room Flow', status: 'pending' },
      { name: 'Flow C', desc: 'Reconnection Flow', status: 'pending' },
    ];

    if (feature) {
      const found = specFeatures.find(f =>
        f.name.toLowerCase().includes(feature.toLowerCase())
      );

      if (found) {
        console.log(chalk.cyan(`Testing: ${found.name} - ${found.desc}`));
        console.log(chalk.yellow('\nSpec tests not yet implemented'));
      } else {
        console.log(chalk.red(`Feature not found: ${feature}`));
        console.log('\nAvailable features:');
        specFeatures.forEach(f => {
          console.log(`  - ${f.name}: ${f.desc}`);
        });
      }
      return;
    }

    if (options.report) {
      console.log(chalk.cyan('Spec Compliance Report'));
      console.log(chalk.dim('─'.repeat(50)));
      console.log('');

      specFeatures.forEach(f => {
        const icon = f.status === 'passed' ? '✓' : f.status === 'failed' ? '✗' : '○';
        const color = f.status === 'passed' ? chalk.green : f.status === 'failed' ? chalk.red : chalk.gray;
        console.log(color(`  ${icon} ${f.name}: ${f.desc}`));
      });

      console.log('');
      console.log(chalk.dim('─'.repeat(50)));
      console.log(chalk.yellow('  0/9 features tested'));
      console.log('');
      return;
    }

    console.log('Spec features to test:');
    specFeatures.forEach(f => {
      console.log(chalk.dim(`  ○ ${f.name}: ${f.desc}`));
    });

    console.log(chalk.yellow('\nSpec tests will be implemented with Vitest\n'));
  },
};
