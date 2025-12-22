import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function getPaths() {
  // src/lib -> src -> apps/cli
  const cliDir = resolve(__dirname, '../..');
  const rootDir = resolve(cliDir, '../..');
  const apiDir = resolve(rootDir, 'apps/api');
  const migrationsDir = resolve(rootDir, 'packages/db-schema/migrations');

  return { cliDir, rootDir, apiDir, migrationsDir };
}
