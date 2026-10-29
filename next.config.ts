import type { NextConfig } from 'next';
const config: NextConfig = {
  distDir: process.env.NEXT_BUILD_DIR || '.next',
  async headers() {
    return [
      {
        source: '/extracted_diagrams/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/materials/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: '/uploads/past_paper_auto_1791881747833_Physics-IX-Paper-I-2025.pdf', destination: '/materials/ssc/physics/ssc-1/physics-ix-2025-paper-i.pdf', permanent: true },
      { source: '/uploads/past_paper_Class_IX_1791885389646_Physics-IX-Paper-II-2025.pdf', destination: '/materials/ssc/physics/ssc-1/physics-ix-2025-paper-ii.pdf', permanent: true },
    ];
  },
  outputFileTracingExcludes: { '*': ['./frontend/**/*', './student-web/**/*', './.venv/**/*', './checkpoints/**/*', './.git/**/*', './.next-hardening/**/*'] },
};
export default config;
