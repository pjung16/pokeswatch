import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  /* config options here */
  async redirects() {
    return [
      {
        source: "/",
        destination: "/pokemon/ampharos",
        permanent: false,
      },
      {
        source: "/pokemon",
        destination: "/pokemon/ampharos",
        permanent: false,
      },
    ]
  },
}

export default nextConfig
