import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  trailingSlash: false,
  async redirects() {
    return [
      {
        source: '/device/:model',
        destination: '/clinics/devices/:model',
        permanent: true,
      },
    ]
  },
}

export default nextConfig
