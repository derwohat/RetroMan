import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    turbopackFileSystemCacheForDev: false,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "image.tmdb.org" },
      { protocol: "https", hostname: "*.discogs.com" },
      { protocol: "https", hostname: "coverartarchive.org" },
      { protocol: "https", hostname: "www.thegamesdb.net" },
      { protocol: "https", hostname: "*.mobygames.com" },
      { protocol: "https", hostname: "covers.openlibrary.org" },
    ],
  },
};

export default nextConfig;
