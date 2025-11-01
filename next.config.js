/** @type {import('next').NextConfig} */
const nextConfig = {
  // Basic Next.js configuration without AI library complications
  experimental: {
    // Keep it simple for stability
  },

  webpack: (config, { isServer }) => {
    // Basic webpack configuration
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;