"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { typedPokemonIdMap } from "./[pokemonList]/PokemonSwatch"

export default function SwatchRedirector() {
  const router = useRouter()

  useEffect(() => {
    const newPokemonList = []
    const usedPokemon = new Set()

    const listOfPokemon = Object.keys(typedPokemonIdMap)
    while (newPokemonList.length < 6) {
      const randomKey =
        Array.from(listOfPokemon)[
          Math.floor(Math.random() * listOfPokemon.length)
        ]
      if (!usedPokemon.has(randomKey)) {
        newPokemonList.push(randomKey)
        usedPokemon.add(randomKey)
      }
    }

    router.replace(`/swatch/${[...newPokemonList].join("-")}`)
  }, [router])

  return null
}
