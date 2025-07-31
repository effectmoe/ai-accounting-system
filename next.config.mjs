/** @type {import('next').NextConfig} */

const nextConfig = {
  
  // Enable SWC minification for better performance
  swcMinify: true,
  
  // Optimize output for production
  output: 'standalone',
  
  webpack: (config, { isServer, webpack }) => {
    // Configure fallbacks for Node.js modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        child_process: false,
        perf_hooks: false,
        crypto: false,
        stream: false,
        path: false,
        os: false,
        vm: false,
        worker_threads: false,
        buffer: false,
        util: false,
        url: false,
        assert: false,
        constants: false,
        module: false,
        _http_common: false,
        http: false,
        https: false,
        zlib: false,
        // Additional fallbacks for problematic modules
        'require-in-the-middle': false,
      };
    }

    // Ignore test directories and problematic modules
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^.*\/test\/.*$/,
        contextRegExp: /@ai-sdk|ai/,
      }),
      new webpack.IgnorePlugin({
        resourceRegExp: /require-in-the-middle/,
      }),
    );
    
    // Handle OpenTelemetry modules properly for client-side
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@opentelemetry/api': false,
        '@opentelemetry/instrumentation': false,
        '@opentelemetry/instrumentation-http': false,
      };
    }

    // Client-side specific configurations
    if (!isServer) {
      // Completely exclude Mastra and its dependencies from client bundle
      config.externals = {
        ...config.externals,
        'mastra': 'mastra',
        '@mastra/core': '@mastra/core',
        'fsevents': 'fsevents',
        'esbuild': 'esbuild',
        '@babel/core': '@babel/core',
        '@babel/preset-typescript': '@babel/preset-typescript',
        'rollup': 'rollup',
        '@mastra/deployer': '@mastra/deployer',
      };

      // Ignore problematic modules
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /mastra|@mastra/,
        }),
        new webpack.IgnorePlugin({
          resourceRegExp: /\.node$/,
        }),
        new webpack.IgnorePlugin({
          resourceRegExp: /fsevents/,
        }),
        new webpack.IgnorePlugin({
          resourceRegExp: /esbuild/,
        }),
        new webpack.IgnorePlugin({
          resourceRegExp: /@babel\/(core|preset-typescript)/,
        }),
        new webpack.IgnorePlugin({
          resourceRegExp: /rollup/,
        })
      );
    }

    // Optimize chunk splitting
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            framework: {
              name: 'framework',
              chunks: 'all',
              test: /(?<!node_modules.*)[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-subscription)[\\/]/,
              priority: 40,
              enforce: true,
            },
            lib: {
              test(module) {
                return module.size() > 160000 &&
                  /node_modules[/\\]/.test(module.identifier());
              },
              name: 'lib',
              priority: 30,
              minChunks: 1,
              reuseExistingChunk: true,
            },
            commons: {
              name: 'commons',
              chunks: 'all',
              minChunks: 2,
              priority: 20,
            },
            shared: {
              name: 'shared',
              priority: 10,
              minChunks: 2,
              reuseExistingChunk: true,
            },
          },
          maxAsyncRequests: 30,
          maxInitialRequests: 30,
        },
      };
    }

    return config;
  },
  
  reactStrictMode: true,
  
  typescript: {
    // Allow production builds with type errors
    ignoreBuildErrors: true,
  },
  
  eslint: {
    // Allow production builds with ESLint errors
    ignoreDuringBuilds: true,
  },
  
  images: {
    domains: ['localhost', 'supabase.co'],
    formats: ['image/avif', 'image/webp'],
    // Optimize image loading
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  experimental: {
    // Server Components configuration
    serverComponentsExternalPackages: [
      'mastra',
      '@mastra/core',
      'fsevents',
      'esbuild',
      '@babel/core',
      '@babel/preset-typescript',
      'rollup',
      '@mastra/deployer',
      'mongodb',
      '@azure/cosmos',
      '@azure/openai',
      '@azure/ai-form-recognizer',
    ],
    
    // Optimize package imports
    optimizePackageImports: [
      '@supabase/supabase-js',
      'lucide-react',
      'date-fns',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-label',
      '@radix-ui/react-popover',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-select',
      '@radix-ui/react-slider',
      '@radix-ui/react-switch',
      '@radix-ui/react-tabs',
      '@mui/material',
      '@mui/icons-material',
      '@mui/x-date-pickers',
    ],
    
  },
  
  // Disable source maps in production
  productionBrowserSourceMaps: false,
  
  // Enable compression
  compress: true,
  
  // Generate build ID
  generateBuildId: async () => {
    return `build-${Date.now()}`;
  },
  
  // Headers configuration
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  
  async redirects() {
    return [
      {
        source: '/api/ocr/pdf',
        destination: '/api/upload/gdrive',
        permanent: true,
      },
    ];
  },
  
  // Module imports optimization
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{member}}',
    },
    'date-fns': {
      transform: 'date-fns/{{member}}',
    },
  },
  
  // Disable powered by header
  poweredByHeader: false,
  
  // Optimize CSS
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Build cache configuration
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  
  // Exclude disabled pages from build
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'].filter(ext => !ext.includes('disabled')),
};

export default nextConfig;