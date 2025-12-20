
import React from 'react';
import { render } from 'ink';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { createWranglerExecutor } from '../lib/db-executor.js';
import { DashboardService } from '../lib/dashboard-service.js';
import { Dashboard } from '../components/Dashboard.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface DashboardOptions {
  local?: boolean;
  remote?: boolean;
  prod?: boolean;
}

export const dashboardCommand = async (options: DashboardOptions) => {
  const isLocal = options.local !== false && !options.remote && !options.prod;

  // Resolve paths similar to db.ts
  const cliDir = resolve(__dirname, '../..');
  const rootDir = resolve(cliDir, '../..');
  const apiDir = resolve(rootDir, 'apps/api');

  const executor = createWranglerExecutor(apiDir, isLocal);
  const service = new DashboardService(executor, isLocal);

  // Clear console before starting TUI
  console.clear();

  const { waitUntilExit } = render(<Dashboard service={service} />);
  await waitUntilExit();
};
