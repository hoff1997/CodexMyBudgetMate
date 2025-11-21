// ...existing code...
const nextConfig = {
  generateBuildId: async () => {
    return `build-${Date.now()}`;
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["*"],
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
// ...existing code...
