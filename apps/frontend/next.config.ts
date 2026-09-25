import type { NextConfig } from "next";
import path from "path";

const repoRoot = path.resolve(__dirname, "..", "..");

const nextConfig: NextConfig = {
  // Removed turbopack root override to avoid watching backend files which causes CPU spikes
};

export default nextConfig;
