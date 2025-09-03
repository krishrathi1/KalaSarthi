/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Exclude puppeteer modules from static analysis on client-side
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
      };
    }

    // Ignore puppeteer modules during client-side build
    config.externals = config.externals || [];
    config.externals.push({
      'puppeteer': 'commonjs puppeteer',
      'puppeteer-extra': 'commonjs puppeteer-extra',
      'puppeteer-extra-plugin-stealth': 'commonjs puppeteer-extra-plugin-stealth',
    });

    return config;
  },
  serverExternalPackages: ['puppeteer', 'puppeteer-extra', 'puppeteer-extra-plugin-stealth'],
};

module.exports = nextConfig;