import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Allow iframe embedding for /embed route
        source: '/embed',
        headers: [
          {
            // CSP: Allow iframe embedding + Turnstile scripts
            // SECURITY: Do NOT use wildcard subdomains (*.rentmil.cz)
            // to prevent subdomain takeover attacks
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://rentmil.cz https://www.rentmil.cz https://kalkulator20-production.up.railway.app; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com;",
          },
          {
            // Permissions-Policy: Restrict sensitive APIs in iframe
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=()',
          },
          {
            // Prevent caching issues with WordPress plugins
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
      {
        // Block iframe embedding for all other routes
        source: '/((?!embed).*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
