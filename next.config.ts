import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  /* Round 16: the floating dev badge (circled "N", bottom-left) reads as a
   * stray artifact in QA screenshots and overlays the Market Pulse band on
   * short viewports. It's dev-only chrome — production is unaffected. */
  devIndicators: false,
};

export default nextConfig;
