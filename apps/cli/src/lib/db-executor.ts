import { spawnSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { resolve } from 'path';
import type { DatabaseExecutor } from '@rank-everything/db-schema';

export interface WranglerResult {
  success: boolean;
  output: string;
  error?: string;
}

export function runWrangler(args: string[], cwd: string, silent = false): WranglerResult {
  try {
    const result = spawnSync('npx', ['wrangler', ...args], {
      cwd,
      encoding: 'utf-8',
      stdio: silent ? 'pipe' : 'inherit',
    });
    return {
      success: result.status === 0,
      output: result.stdout || '',
      error: result.stderr || undefined,
    };
  } catch (error) {
    return { success: false, output: '', error: String(error) };
  }
}

/**
 * Create a DatabaseExecutor that uses wrangler d1 execute
 */
export function createWranglerExecutor(apiDir: string, isLocal: boolean): DatabaseExecutor {
  const target = isLocal ? '--local' : '--remote';

  return {
    async execute(sql: string): Promise<{ success: boolean; error?: string }> {
      // Write SQL to temp file to handle multi-statement SQL
      const tempFile = resolve(apiDir, '.temp-migration.sql');
      writeFileSync(tempFile, sql);

      const result = runWrangler(
        ['d1', 'execute', 'rank-everything-db', target, '--file', tempFile],
        apiDir,
        true
      );

      // Clean up temp file
      try {
        unlinkSync(tempFile);
      } catch {
        // Ignore cleanup errors
      }

      if (!result.success) {
        // Check if error is just "already exists" which is OK
        if (result.error?.includes('already exists') || result.output?.includes('already exists')) {
          return { success: true };
        }
        return { success: false, error: result.error || result.output };
      }

      return { success: true };
    },

    async query<T>(sql: string): Promise<{ success: boolean; results?: T[]; error?: string }> {
      const result = runWrangler(
        ['d1', 'execute', 'rank-everything-db', target, '--command', sql, '--json'],
        apiDir,
        true
      );

      if (!result.success) {
        return { success: false, error: result.error || result.output };
      }

      try {
        // Parse wrangler JSON output
        const parsed = JSON.parse(result.output);
        // Wrangler returns array of results, first one contains our query result
        const queryResult = parsed[0];
        return { success: true, results: queryResult?.results || [] };
      } catch {
        // If not JSON, return empty results
        return { success: true, results: [] };
      }
    },
  };
}

export function listKVKeys(
  apiDir: string,
  binding: string,
  isLocal: boolean,
  prefix?: string
): string[] {
  // wrangler kv:key list --binding <BINDING> --local/--remote --prefix <PREFIX>
  const target = isLocal ? '--local' : '--remote';
  const args = ['kv:key', 'list', '--binding', binding, target];
  if (prefix) args.push('--prefix', prefix);

  // Wrangler KV operations are usually JSON
  const result = runWrangler(args, apiDir, true);

  if (!result.success) {
    // If local and fails, might be just empty or not initialized
    return [];
  }

  try {
    const parsed = JSON.parse(result.output); // Array of { name: string }
    return parsed.map((k: { name: string }) => k.name);
  } catch {
    return [];
  }
}
