"use client"

import React, { useEffect, useMemo } from "react"
import {
  parsePokemonUrlPath,
  pokemonNameToQueryableName,
  pokemonWithHyphens,
} from "../../utils"
import { BattlePokemonIconIndexes } from "../../BattlePokemonIconIndexes"
import PokemonSwatch, { typedPokemonIdMap } from "./PokemonSwatch"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import * as R from "ramda"
import { useParams, useRouter } from "next/navigation"
import styles from "../styles.module.css"
import { useSwatchPageContext } from "../SwatchPageContext"

const validPokemonSet = new Set([
  ...Object.keys(BattlePokemonIconIndexes),
  ...Object.keys(pokemonWithHyphens),
])
// Create a client
const queryClient = new QueryClient()

export default function PokemonSwatchPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <PokemonTeamPage />
    </QueryClientProvider>
  )
}

function PokemonTeamPage() {
  const { pokemonList } = useParams<{ pokemonList: string }>()
  const parsedPokemon = useMemo(
    () =>
      pokemonList ? parsePokemonUrlPath(pokemonList, validPokemonSet) : [],
    [pokemonList]
  )
  const router = useRouter()
  const { colorFormat, showAnimations } = useSwatchPageContext()

  const updatePokemonRoute = (
    currentUrl: string,
    oldPokemonName: string,
    newPokemonName: string
  ) => {
    const newPokemonList = currentUrl?.replace(oldPokemonName, newPokemonName)
    window.history.pushState({}, "", `${newPokemonList}`)
  }

  useEffect(() => {
    if (parsedPokemon.length < 6) {
      const additionalPokemon = []
      const usedPokemon = new Set(parsedPokemon)

      const listOfPokemon = Object.keys(typedPokemonIdMap)
      while (additionalPokemon.length + parsedPokemon.length < 6) {
        const randomKey =
          Array.from(listOfPokemon)[
            Math.floor(Math.random() * listOfPokemon.length)
          ]
        if (!usedPokemon.has(randomKey)) {
          additionalPokemon.push(randomKey)
          usedPokemon.add(randomKey)
        }
      }

      router.push(
        `/swatch/${[...parsedPokemon, ...additionalPokemon].join("-")}`
      )
    }
    // if parsedPokemon length is greater than 6, only use the first 6 pokemon and discard the rest
    if (parsedPokemon.length > 6) {
      const trimmedPokemon = parsedPokemon.slice(0, 6)
      router.push(`/swatch/${trimmedPokemon.join("-")}`)
    }
  }, [parsedPokemon, router.push])

  useEffect(() => {
    const pokemonWithQueryableNames = parsedPokemon.map((p) =>
      pokemonNameToQueryableName(p)
    )
    if (!R.equals(pokemonWithQueryableNames, parsedPokemon)) {
      router.push(`/swatch/${pokemonWithQueryableNames.join("-")}`)
    }
  }, [router.push, parsedPokemon])

  return (
    <div>
      <div className={styles.pokemonSwatchContainer}>
        {parsedPokemon.map((name, idx) => (
          <PokemonSwatch
            key={`${name}-${idx}`}
            pokemon={name}
            updatePokemonRoute={updatePokemonRoute}
            colorFormat={colorFormat}
            showAnimations={showAnimations}
          />
        ))}
      </div>
      <footer className={styles.footer}>
        <div>
          Disclaimer: This is a fan-made project and is not affiliated with,
          endorsed, sponsored, or specifically approved by Nintendo, Game Freak,
          or The Pokémon Company. All Pokémon content, including names, images,
          and other associated media, are the property of their respective
          owners.
        </div>
        <div>
          Credits: Portions of this website utilize assets and code from the
          PokéRogue project, which is licensed under the AGPL-3.0 License. In
          accordance with this license, the source code for this website is
          available at: https://github.com/pjung16/pokeswatch
        </div>
        <div>© 2025 PokeSwatch. All rights reserved.</div>
      </footer>
    </div>
  )
}
