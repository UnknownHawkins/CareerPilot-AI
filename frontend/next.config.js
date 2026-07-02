      /** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost', 'storage.googleapis.com', 'firebasestorage.googleapis.com'],
  },
  env: {
    API_URL: process.env.API_URL || 'http://localhost:5000',
  },
  async rewrites() {
    const apiUrl = process.env.API_URL ? process.env.API_URL.replace(/\/api\/v1\/?$/, '') : 'http://localhost:5000';
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/v1/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
