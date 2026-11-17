import path from 'node:path'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // The home directory also has a lockfile. Keep tracing rooted in this app.
  outputFileTracingRoot: path.join(__dirname),
  poweredByHeader: false,
}

export default nextConfig
