import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Forced rebuild timestamp: 2026-02-20
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;
