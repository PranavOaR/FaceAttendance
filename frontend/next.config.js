/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
    ],
    // Alternative: Disable image optimization for external images (less secure but more flexible)
    // unoptimized: true,
    
    // Or allow all domains (not recommended for production)
    // domains: ['firebasestorage.googleapis.com'],
  },
  // Enable experimental features if needed
  experimental: {
    // Add any experimental features here
  },
}

module.exports = nextConfig