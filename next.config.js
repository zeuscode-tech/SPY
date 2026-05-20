const isCapBuild = process.env.CAPACITOR_BUILD === 'true';

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development' || isCapBuild,
  runtimeCaching: [
    {
      urlPattern: /^https?.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'http-cache',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 60 * 60 * 24 * 7,
        },
      },
    },
  ],
  fallbacks: {
    document: '/offline.html',
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: isCapBuild ? 'export' : undefined,
  trailingSlash: isCapBuild,
  images: {
    unoptimized: true,
  },

  // ── PWA & Performance ──────────────────────────────────────────────────────
  reactStrictMode: true,
  // ── Skip type-check & lint during Capacitor build to save memory ─────────
  ...(isCapBuild && {
    typescript: { ignoreBuildErrors: true },
    eslint: { ignoreDuringBuilds: true },
  }),

  // ── Compiler optimizations ─────────────────────────────────────────────────
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // ── Headers for PWA / mobile ───────────────────────────────────────────────
  ...(!isCapBuild && {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options',    value: 'nosniff' },
          { key: 'X-Frame-Options',           value: 'DENY' },
          { key: 'X-XSS-Protection',          value: '1; mode=block' },
          { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        ],
      },
    ];
  },
  }),
};

module.exports = isCapBuild ? nextConfig : withPWA(nextConfig);
