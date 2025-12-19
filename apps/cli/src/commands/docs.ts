import chalk from 'chalk';
import { execSync } from 'child_process';
import { resolve } from 'path';
import { existsSync } from 'fs';

export async function docsCommand(doc?: string): Promise<void> {
  console.log(chalk.bold('\n📚 Documentation\n'));

  const rootDir = resolve(process.cwd(), '../..');

  const docs: Record<string, { path: string; desc: string }> = {
    spec: { path: 'specs/PROJECT_SPEC.md', desc: 'Full product specification' },
    cli: { path: 'specs/CLI_SPEC.md', desc: 'CLI tool documentation' },
    readme: { path: 'README.md', desc: 'Project README' },
    claude: { path: 'CLAUDE.md', desc: 'Claude Code context' },
  };

  if (doc) {
    const docInfo = docs[doc.toLowerCase()];

    if (!docInfo) {
      console.log(chalk.red(`Unknown document: ${doc}`));
      console.log('\nAvailable documents:');
      Object.entries(docs).forEach(([key, info]) => {
        console.log(`  ${chalk.cyan(key)}: ${info.desc}`);
      });
      return;
    }

    const fullPath = resolve(rootDir, docInfo.path);

    if (!existsSync(fullPath)) {
      console.log(chalk.yellow(`Document not found: ${docInfo.path}`));
      return;
    }

    console.log(`Opening: ${chalk.cyan(docInfo.path)}`);
    console.log(chalk.dim(docInfo.desc));
    console.log('');

    // Try to open in default editor or viewer
    try {
      const platform = process.platform;
      if (platform === 'darwin') {
        execSync(`open "${fullPath}"`);
      } else if (platform === 'win32') {
        execSync(`start "" "${fullPath}"`);
      } else {
        execSync(`xdg-open "${fullPath}"`);
      }
      console.log(chalk.green('Document opened\n'));
    } catch {
      console.log(chalk.dim(`Path: ${fullPath}\n`));
    }
    return;
  }

  // List all docs
  console.log('Available documentation:\n');

  Object.entries(docs).forEach(([key, info]) => {
    const fullPath = resolve(rootDir, info.path);
    const exists = existsSync(fullPath);
    const status = exists ? chalk.green('✓') : chalk.red('✗');
    console.log(`  ${status} ${chalk.cyan(key.padEnd(10))} ${info.desc}`);
  });

  console.log(chalk.dim('\nUsage: rank docs <name>\n'));
}
