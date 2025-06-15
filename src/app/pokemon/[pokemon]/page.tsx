import { promises as fs } from "fs"
import { TPokemon } from "../../types"
import PokemonClientPage from "./PokemonClientPage"

export const dynamicParams = false

export async function generateStaticParams() {
  const file = await fs.readFile(
    process.cwd() + "/src/app/species.json",
    "utf8"
  )
  const data = JSON.parse(file) as Record<TPokemon, number>

  return Object.keys(data).map((pokemon) => ({
    pokemon,
  }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ pokemon: string }>
}) {
  const { pokemon } = await params
  const pokemonName = pokemon.charAt(0).toUpperCase() + pokemon.slice(1)
  return {
    title: `${pokemonName} - PokeSwatch`,
    description: `Discover the color palette of ${pokemonName}!`,
  }
}

export default async function Page({
  params,
}: {
  params: Promise<{ pokemon: string }>
}) {
  const { pokemon } = await params
  return (
    <>
      <PokemonClientPage params={{ pokemon }}>{pokemon}</PokemonClientPage>
      {/* <div>
        Discover the color palette of{" "}
        {pokemon.charAt(0).toUpperCase() + pokemon.slice(1)}!
      </div> */}
    </>
  )
}
