import type { NextConfig } from 'next';
const config: NextConfig = {
  distDir: process.env.NEXT_BUILD_DIR || '.next',
  outputFileTracingExcludes: { '*': ['./frontend/**/*', './student-web/**/*', './.venv/**/*', './checkpoints/**/*', './.git/**/*', './.next-hardening/**/*'] },
};
export default config;
