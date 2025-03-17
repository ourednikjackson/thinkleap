/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable Node.js modules in server components
  serverComponentsExternalPackages: ['pg', 'pg-native'],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't bundle pg on the client side
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'pg-native': false,
        pg: false,
      };
    }
    return config;
  },
  experimental: {
    // Enable server actions for database operations
    serverActions: true,
  },
};

module.exports = nextConfig;
