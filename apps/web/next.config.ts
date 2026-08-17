import type { NextConfig } from 'next';
import path from 'path';

const config: NextConfig = {
  // Silence workspace-root detection warning when a lockfile exists above the monorepo root.
  outputFileTracingRoot: path.resolve(__dirname, '../../'),
};

export default config;
