import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["libraw-wasm"],
  turbopack: {},
};

export default nextConfig;
