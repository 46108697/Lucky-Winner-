/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // App Router perf
  experimental: {
    optimizePackageImports: [
      "firebase/app",
      "firebase/auth",
      "firebase/firestore",
      "lucide-react",
      "@radix-ui/react-popover",
      "@radix-ui/react-dialog"
    ],
  },

  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 31536000,
    remotePatterns: [
      { protocol: "https", hostname: "**.googleusercontent.com" },
      { protocol: "https", hostname: "**.firebasestorage.googleapis.com" },
      { protocol: "https", hostname: "lucky-winner.com" }
    ]
  },

  // Static assets को long cache
  poweredByHeader: false,
  compress: true,
};

module.exports = nextConfig;
