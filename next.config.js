/** @type {import('next').NextConfig} */
const nextConfig = {
  // Development optimizations
  compress: process.env.NODE_ENV === 'production',
  poweredByHeader: false,

  // TypeScript and ESLint optimizations for dev
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Experimental features for performance
  experimental: {
    optimizeCss: process.env.NODE_ENV === 'production',
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
    memoryBasedWorkersCount: true,
  },

  webpack: (config, { isServer, dev, webpack }) => {
    // Fix for @xenova/transformers environment variables
    config.plugins.push(
      new webpack.DefinePlugin({
        'process.env.TRANSFORMERS_CACHE': JSON.stringify('./models'),
        'process.env.ONNX_CACHE': JSON.stringify('./models'),
      })
    );

    // Provide polyfills for Node.js modules in browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: require.resolve('path-browserify'),
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        util: require.resolve('util'),
        buffer: require.resolve('buffer'),
        process: require.resolve('process/browser'),
        os: false,
        net: false,
        tls: false,
        url: require.resolve('url'),
        zlib: false,
        http: false,
        https: false,
        assert: require.resolve('assert'),
        querystring: require.resolve('querystring-es3'),
        child_process: false,
        'node:buffer': false,
        'node:fs': false,
        'node:https': false,
        'node:http': false,
        'node:crypto': false,
        'node:stream': false,
        'node:util': false,
        'node:path': false,
        'node:os': false,
        'node:url': false,
        'node:querystring': false,
      };

      config.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
          process: 'process/browser',
        })
      );

      // Externals for client-side
      config.externals = config.externals || [];
      config.externals.push({
        'puppeteer': 'commonjs puppeteer',
        'puppeteer-extra': 'commonjs puppeteer-extra',
        'puppeteer-extra-plugin-stealth': 'commonjs puppeteer-extra-plugin-stealth',
        '@google-cloud/text-to-speech': 'commonjs @google-cloud/text-to-speech',
        '@google-cloud/speech': 'commonjs @google-cloud/speech',
        '@google-cloud/bigquery': 'commonjs @google-cloud/bigquery',
        '@google-cloud/common': 'commonjs @google-cloud/common',
        'google-auth-library': 'commonjs google-auth-library',
        'child_process': 'commonjs child_process',
        'teeny-request': 'commonjs teeny-request',
        'node-fetch': 'commonjs node-fetch',
        'fetch-blob': 'commonjs fetch-blob',
        'faiss-node': 'commonjs faiss-node',
        'mongodb': 'commonjs mongodb',
        'redis': 'commonjs redis',
      });
    }

    // Development optimizations
    if (dev) {
      config.optimization = {
        ...config.optimization,
        splitChunks: false,
      };
    } else {
      // Production optimizations
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
            },
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              enforce: true,
            },
          },
        },
      };
    }

    // Handlebars configuration - CRITICAL FIX
    config.resolve.alias = {
      ...config.resolve.alias,
      // Map the CJS path to the actual handlebars module
      'handlebars/dist/cjs/handlebars.js': require.resolve('handlebars'),
      'handlebars': require.resolve('handlebars'),
    };

    // Suppress handlebars require.extensions warning
    config.module.exprContextCritical = false;

    // Add handlebars loader to handle .hbs files
    config.module.rules.push({
      test: /\.hbs$/,
      loader: 'handlebars-loader'
    });

    // Resolve handlebars extensions
    config.resolve.extensions.push('.hbs');

    // Ignore handlebars warnings
    config.ignoreWarnings = [
      { module: /node_modules\/handlebars/ },
      { message: /require\.extensions is not supported by webpack/ },
      { message: /require\.extensions/ }
    ];

    return config;
  },

  serverExternalPackages: [
    'puppeteer',
    'puppeteer-extra',
    'puppeteer-extra-plugin-stealth',
    '@google-cloud/text-to-speech',
    '@google-cloud/speech',
    '@google-cloud/bigquery',
    '@google-cloud/common',
    'google-auth-library',
    'teeny-request',
    'node-fetch',
    'fetch-blob',
    'faiss-node',
    'mongodb',
    'redis'
  ],

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images-na.ssl-images-amazon.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'm.media-amazon.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'rukminim1.flixcart.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'rukminim2.flixcart.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.etsystatic.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '5.imimg.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.ebayimg.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images-static.nykaa.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'loremflickr.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

module.exports = nextConfig;