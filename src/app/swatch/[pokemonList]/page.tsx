import { promises as fs } from "fs"
import { TPokemon } from "../../types"
import PokemonSwatchPage from "./PokemonSwatchPage"
import { Metadata } from "next"
import { SwatchPageProvider } from "../SwatchPageContext"
import { isPrismaCuid } from "@/app/utils"

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
  console.log(isCuid)
  console.log(pokemonList)
  if (isCuid) {
    return <div>Valid CUID</div>
  }
  return (
    <>
      {/* <div>Create your own swatch for your favorite Pokémon! </div> */}
      <PokemonSwatchPage />
    </>
  )
}
