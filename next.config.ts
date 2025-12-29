import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Allow iframe embedding for /embed route
        source: '/embed',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://rentmil.cz https://www.rentmil.cz https://*.rentmil.cz",
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
