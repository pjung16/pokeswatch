import { promises as fs } from "fs"
import { TPokemon } from "../../types"
import PokemonSwatchPage from "./PokemonSwatchPage"
import { Metadata } from "next"
import { SwatchPageProvider } from "../SwatchPageContext"

export const metadata: Metadata = {
  robots: "noindex",
}

export default async function Page({
  params,
}: {
  params: Promise<{ pokemonList: string }>
}) {
  return (
    <>
      {/* <div>Create your own swatch for your favorite Pokémon! </div> */}
      <PokemonSwatchPage />
    </>
  )
}
