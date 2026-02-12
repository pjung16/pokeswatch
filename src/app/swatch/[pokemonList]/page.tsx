import { Metadata } from "next"
import PokemonSwatchDisplayPage from "./PokemonSwatchDisplayPage"

export const metadata: Metadata = {
  robots: "noindex",
}

export default async function Page() {
  return <PokemonSwatchDisplayPage />
}
