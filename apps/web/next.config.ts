import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  pageExtensions: ["ts", "tsx"],
  async rewrites() {
    return [
      {
        source: '/api/admin/:path*',
        destination: 'http://localhost:4000/admin/:path*',
      },
    ];
  },
};

export default nextConfig;
