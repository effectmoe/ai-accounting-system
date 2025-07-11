/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@mastra/core'],
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        _http_common: false,
        http: false,
        https: false,
        stream: false,
        zlib: false,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
      };
    }
    
    // aiパッケージのtestディレクトリを無視
    config.resolve.alias = {
      ...config.resolve.alias,
      '@ai-sdk/provider-utils/test': false,
      'ai/test': false,
    };
    
    // webpack IgnorePluginを使用
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^.*\/test\/.*$/,
        contextRegExp: /@ai-sdk|ai/,
      })
    );
    
    // aiモジュールのtestディレクトリを完全に除圄
    config.module.rules.push({
      test: /node_modules\/(ai|@ai-sdk).*\/test\/.*/,
      use: 'null-loader',
    });

    return config;
  },
  reactStrictMode: true,
  swcMinify: true,
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  images: {
    domains: ['localhost', 'supabase.co'],
  },
  experimental: {
    // RSCのプリフェッチを制御
    optimizePackageImports: ['@supabase/supabase-js'],
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
    ];
  },
};

module.exports = nextConfig;