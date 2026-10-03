import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Round 16: Standalone output is opt-in for containerized environments */
  output: process.env.BUILD_STANDALONE === "true" ? "standalone" : undefined,
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  /* Round 16: the floating dev badge (circled "N", bottom-left) reads as a
   * stray artifact in QA screenshots and overlays the Market Pulse band on
   * short viewports. It's dev-only chrome — production is unaffected. */
  devIndicators: false,
  outputFileTracingIncludes: {
    "/**": ["./db/**"],
  },
};

export default nextConfig;
