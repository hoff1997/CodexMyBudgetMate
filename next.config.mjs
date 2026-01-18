/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  generateBuildId: async () => {
    // Force unique build ID to prevent cache issues
    return `build-${Date.now()}`;
  },
  experimental: {
    serverActions: {
      // SECURITY: Restrict to same origin only
      allowedOrigins: [
        process.env.NEXT_PUBLIC_SITE_URL || "https://codex-my-budget-mate.vercel.app",
      ].filter(Boolean),
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
  // Security headers for Akahu certification compliance
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            // Prevent clickjacking attacks
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            // Prevent MIME type sniffing
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            // Enable XSS protection (legacy browsers)
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            // Control referrer information
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            // Restrict browser features
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          {
            // Force HTTPS for 1 year (enable after confirming HTTPS works)
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          {
            // Content Security Policy
            // Note: 'unsafe-inline' and 'unsafe-eval' needed for Next.js
            // Consider tightening in production with nonces
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://images.unsplash.com https://*.supabase.co",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.akahu.io https://*.upstash.io",
              "frame-ancestors 'none'",
              "form-action 'self'",
              "base-uri 'self'",
              "upgrade-insecure-requests",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
