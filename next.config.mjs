/** @type {import('next').NextConfig} */

const nextConfig = {
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
      };
    }

    // Ignore test directories
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^.*\/test\/.*$/,
        contextRegExp: /@ai-sdk|ai/,
      })
    );

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
};

export default nextConfig;