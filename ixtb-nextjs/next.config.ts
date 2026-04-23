import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["fimidx-core"],
  productionBrowserSourceMaps: true,
  // webpack: (config, { isServer, dev }) => {
  //   // Only generate source maps for production builds
  //   if (isServer && !dev) {
  //     config.devtool = "source-map";
  //   }
  //   return config;
  // },
};

export default nextConfig;
