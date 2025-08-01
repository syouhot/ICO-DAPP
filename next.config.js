/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: false, // Keep this false for pages directory
    esmExternals: "loose", // This helps with ESM/CommonJS compatibility
    // 启用 Webpack 5 的 Import Attributes 支持
    webpackBuildWorker: true,
  },
  transpilePackages: [
    "@base-org/account", // 显式 transpile 这个包
    "@vanilla-extract/sprinkles",
    "@rainbow-me/rainbowkit",
    "@reown/appkit",
    "@walletconnect/ethereum-provider",
    "@walletconnect/universal-provider",
  ],
  webpack: (config, { isServer }) => {
    config.module.rules.push({
      test: /\.json$/,
      type: 'javascript/auto',
      use: 'json-loader',
      resolve: {
        fullySpecified: false, // 允许省略扩展名
      },
    });
    // Handle module resolution issues
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
      stream: false,
      http: false,
      https: false,
      zlib: false,
      path: false,
      os: false,
    };

    // Fix for ESM/CommonJS compatibility
    config.externals.push({
      "utf-8-validate": "commonjs utf-8-validate",
      bufferutil: "commonjs bufferutil",
    });

    // Fix for vanilla-extract and other CommonJS modules
    config.module.rules.push({
      test: /\.m?js$/,
      type: "javascript/auto",
      resolve: {
        fullySpecified: false,
      },
    });

    // Handle .mjs files
    config.module.rules.push({
      test: /\.mjs$/,
      include: /node_modules/,
      type: "javascript/auto",
    });

    return config;
  },
  // If you're using static export
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
 
};

module.exports = nextConfig;
