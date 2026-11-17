import path from 'node:path'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // The home directory also has a lockfile. Keep tracing rooted in this app.
  outputFileTracingRoot: path.join(__dirname),
  // better-sqlite3 is a native module. Keep it out of the webpack bundle.
  serverExternalPackages: ['better-sqlite3'],
  poweredByHeader: false,
}

export default nextConfig
