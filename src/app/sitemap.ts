import { type MetadataRoute } from "next"
import species from "./species.json"

// Example: list of all valid Pokémon names — you’d usually fetch this from a DB or API
const allPokemonNames = Object.keys(species)

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://pokeswatch.com"

  const staticRoutes = [
    { url: `${baseUrl}/`, lastModified: new Date() },
    { url: `${baseUrl}/swatch`, lastModified: new Date() },
  ]

  const dynamicPokemonRoutes = allPokemonNames.map((name) => ({
    url: `${baseUrl}/pokemon/${name}`,
    lastModified: new Date(),
  }))

  return [...staticRoutes, ...dynamicPokemonRoutes]
}
