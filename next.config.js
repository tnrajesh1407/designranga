/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '30mb',
    },
  },
  // Increase server body size limit for API routes handling large image uploads
  serverExternalPackages: ['sharp'],
}

module.exports = nextConfig
