import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'image.aladin.co.kr', pathname: '/**' },
      { protocol: 'https', hostname: 'www.aladin.co.kr', pathname: '/**' },
    ],
  },
};

export default nextConfig;
