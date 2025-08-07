import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  /* config options here */
  async redirects() {
    return [
      {
        source: "/pokemon",
        destination: "/pokemon/ampharos",
        permanent: false,
      },
    ]
  },
}

export default nextConfig
