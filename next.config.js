/** @type {import('next').NextConfig} */
const { withSentryConfig } = require("@sentry/nextjs");

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
    
    // aiモジュールのtestディレクトリを完全に除外
    // config.module.rules.push({
    //   test: /node_modules\/(ai|@ai-sdk).*\/test\/.*/,
    //   use: 'null-loader',
    // });

    // バンドル分析（環境変数で有効化）
    if (process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          reportFilename: './analyze.html',
          openAnalyzer: false,
        })
      );
    }

    return config;
  },
  reactStrictMode: true,
  // swcMinify: true,
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
    // 画像の最適化
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    // RSCのプリフェッチを制御
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
  // 出力の最適化
  // output: 'standalone', // Vercelと互換性がないためコメントアウト
  // ソースマップの生成を本番環境で無効化
  productionBrowserSourceMaps: false,
  // 圧縮の改善
  compress: true,
  // ビルドIDを生成（キャッシュバスティング）
  generateBuildId: async () => {
    // タイムスタンプベースのビルドIDを生成
    return `build-${Date.now()}`;
  },
  // 静的ファイルのキャッシュ設定
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
        // 静的アセットのキャッシュ
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // フォントのキャッシュ
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
  // ビルド時の最適化
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{member}}',
    },
    'date-fns': {
      transform: 'date-fns/{{member}}',
    },
  },
};

// Sentry設定オプション
const sentryWebpackPluginOptions = {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  // Suppresses source map uploading logs during build
  silent: true,
  org: "effect-cz",
  project: "mastra-accounting",
};

// Make sure adding Sentry options is the last code to run before exporting, to
// ensure that your source maps include changes from all other Webpack plugins
// module.exports = withSentryConfig(nextConfig, sentryWebpackPluginOptions, {
//   // For all available options, see:
//   // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

//   // Automatically tree-shake Sentry logger statements to reduce bundle size
//   disableLogger: false, // デバッグのため一時的に無効化

//   // Hides source maps from generated client bundles
//   hideSourceMaps: true,

//   // Transpiles SDK to be compatible with IE11 (increases bundle size)
//   transpileClientSDK: false,
// });

// Sentryを一時的に無効化
module.exports = nextConfig;