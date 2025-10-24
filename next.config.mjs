/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    function parseCsp(cspString) {
      const directives = {}
      cspString.split(";").forEach((directive) => {
        const trimmed = directive.trim()
        if (!trimmed) return
        const [key, ...values] = trimmed.split(/\s+/)
        directives[key] = values
      })
      return directives
    }

    function stringifyCsp(directives) {
      return Object.entries(directives)
        .map(([key, values]) => `${key} ${values.join(" ")}`)
        .join("; ")
    }

    function mergeCsp(origValue, additions) {
      const orig = parseCsp(origValue)
      const add = parseCsp(additions)
      
      for (const [key, values] of Object.entries(add)) {
        if (!orig[key]) {
          orig[key] = values
        } else {
          const existing = new Set(orig[key])
          values.forEach((v) => existing.add(v))
          orig[key] = Array.from(existing)
        }
      }
      
      return stringifyCsp(orig)
    }

    const baseCSP = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://browser.sentry-cdn.com https://*.sentry.io https://*.pusher.com https://vercel.live https://cdn.cr-relay.com https://vercel.com https://fides-cdn.ethyca.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https://*.sentry.io",
      "font-src 'self' https://fonts.gstatic.com data:",
      `connect-src 'self' https://*.sentry.io wss://*.pusher.com https://*.pusher.com ${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""} https://vercel.live`,
      "frame-src 'self'",
      "worker-src 'self' blob:",
      "media-src 'self' blob: data:",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'"
    ].join("; ")

    const sumupCSP = [
      "script-src https://gateway.sumup.com",
      "connect-src https://gateway.sumup.com https://api.sumup.com",
      "frame-src https://gateway.sumup.com",
      "img-src https://static.sumup.com",
    ].join("; ")

    const finalCSP = mergeCsp(baseCSP, sumupCSP)

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: finalCSP },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    unoptimized: true,
  },
  compress: true,
  poweredByHeader: false,
  experimental: {
    scrollRestoration: true,
  },
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      }
    }
    return config
  },
}

export default nextConfig
