import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    proxyClientMaxBodySize: "35mb",
  },
  serverExternalPackages: ["firebase-admin", "@google-cloud/storage"],
  turbopack: {
    root: __dirname,
  },
  images: {
    qualities: [70, 70, 75, 90],
  },
};

export default nextConfig;
