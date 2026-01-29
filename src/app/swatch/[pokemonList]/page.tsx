import { promises as fs } from "fs"
import { TPokemon } from "../../types"
import PokemonSwatchPage from "./PokemonSwatchPage"
import { Metadata } from "next"
import { SwatchPageProvider } from "../SwatchPageContext"
import { isPrismaCuid } from "@/app/utils"
import PokemonSavedSwatchPage from "./PokemonSavedSwatchPage"

export const metadata: Metadata = {
  robots: "noindex",
}

export default async function Page({
  params,
}: {
  params: Promise<{ pokemonList: string }>
}) {
  const {pokemonList} = await params
  const isCuid = isPrismaCuid(pokemonList)

  if (isCuid) {
    return <PokemonSavedSwatchPage />
  }
  return (
    <>
      {/* <div>Create your own swatch for your favorite Pokémon! </div> */}
      <PokemonSwatchPage />
    </>
  )
}
