/** @type {import('next').NextConfig} */
const nextConfig = {
  // standalone mode — copies only the files needed to run the server.
  // Required for Docker / Cloud Run: produces a self-contained .next/standalone
  // directory that runs with `node server.js`, no node_modules install needed.
  output: 'standalone',

  experimental: {
    serverActions: {
      bodySizeLimit: '30mb',
    },
  },
  // sharp must run natively inside the container — keep it external to the
  // Next.js bundler so it loads the platform-specific Linux binary at runtime.
  serverExternalPackages: ['sharp'],
}

module.exports = nextConfig
