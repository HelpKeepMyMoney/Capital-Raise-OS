import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["firebase-admin", "@google-cloud/storage"],
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
