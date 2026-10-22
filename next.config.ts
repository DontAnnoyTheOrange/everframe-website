import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Cloudinary delivers all photography (added in Phase C).
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
};

export default nextConfig;
