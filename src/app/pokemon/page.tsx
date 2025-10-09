// app/swatch/page.tsx
import PokemonRedirector from "./PokemonRedirector"

export const metadata = {
  title: "Pokémon color palettes",
  description: "Find color palettes from any Pokémon.",
}

export default function PokemonPage() {
  return (
    <div>
      <PokemonRedirector />
    </div>
  )
}
