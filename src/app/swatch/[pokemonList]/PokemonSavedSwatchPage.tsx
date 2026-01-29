"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  getPokemonIcon,
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
import Footer from "@/app/components/Footer"
import { Button, MenuItem, SelectChangeEvent } from "@mui/material"
import { FormControl, InputLabel, Select } from "@mui/material"
import axios from "axios"
import { ISwatch } from "@/types/swatch"
import api from "@/app/api/api"
import { IPokemonColorsResponseData } from "@/types/PokemonColorResponseData"

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
    const pokemonWithQueryableNames = parsedPokemon.map((p) =>
      pokemonNameToQueryableName(p)
    )
    if (!R.equals(pokemonWithQueryableNames, parsedPokemon)) {
      router.push(`/swatch/${pokemonWithQueryableNames.join("-")}`)
    }
  }, [router.push, parsedPokemon])

  const [swatches, setSwatches] = useState<ISwatch[]>([])
  const [selectedSwatch, setSelectedSwatch] = useState<string>("")

  const fetchSwatches = useCallback(async () => {
    api.get<ISwatch[]>('/swatches')
    .then((response) => {
      console.log(response.data)
      setSwatches(response.data)
    })
    .catch((error) => {
      console.error(error)
    })
  }, [])

  const saveSwatch = useCallback(async () => {
    api.post<ISwatch>('/swatches', {
      pokemon: pokemonList,
      // swatchName: selectedSwatch,
    })
    .then((response) => {
      console.log(response.data)
      fetchSwatches()
    })
  }, [pokemonList, selectedSwatch])

  const onSwatchSelect = useCallback((e: SelectChangeEvent<string>) => {
    setSelectedSwatch(e.target.value)
    const swatch = swatches.find((swatch) => swatch.id === e.target.value)
    if (swatch) {
      router.push(`/swatch/${swatch.pokemon}`)
    }
  }, [swatches, router.push])

  useEffect(() => { 
    fetchSwatches()
  }, [fetchSwatches])

  const [savedSwatchPokemonAndColors, setSavedSwatchPokemonAndColors] = useState<
    Array<{ id: string; pokemon: {pokemonName: string; colors: IPokemonColorsResponseData["colors"] }[] }>
  >([])

  useEffect(() => {
    const fetchSwatchColors = async () => {
      const results = await Promise.all(
        swatches.map(async (swatch) => {
          const savedSwatchPokemon = parsePokemonUrlPath(swatch.pokemon, validPokemonSet)
          const pokemonAndColors = await Promise.all(
            savedSwatchPokemon.map(async (pokemon) => {
              const colors = await api.get<IPokemonColorsResponseData>(
                `/pokemon-colors/${pokemonNameToQueryableName(pokemon)}?shiny=false`
              )
              return {
                pokemonName: pokemon,
                colors: colors.data.colors,
              }
            })
          )
          return {
            id: swatch.id,
            pokemon: pokemonAndColors,
          }
        })
      )
      setSavedSwatchPokemonAndColors(results)
    }

    if (swatches.length > 0) {
      fetchSwatchColors()
    }
  }, [swatches])

  console.log(savedSwatchPokemonAndColors)

  return (
    <div>
      <div style={{ display: "flex", gap: "12px", padding: "0 70px" }}>
        <FormControl fullWidth>
          <InputLabel id="swatch">Swatch</InputLabel>
          <Select
            labelId="demo-simple-select-label"
            id="demo-simple-select"
            value={selectedSwatch}
            label="Age"
            onChange={onSwatchSelect}
          >
            {savedSwatchPokemonAndColors.map((swatch) => {
              return (
                <MenuItem value={swatch.id}>
                  <div style={{ display: "flex", width: "100%", height: "40px", justifyContent: "space-evenly" }}>
                    {swatch.pokemon.map((pokemon, idx) => (
                      <div key={`${pokemon.pokemonName}-${idx}`} style={{width: "100%", display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: pokemon.colors[0].color}}>
                        <div style={{ background: getPokemonIcon(pokemon.pokemonName.replaceAll("-", "")), width: "40px", height: "30px", imageRendering: "pixelated", transform: "scale(1.2)" }} />
                      </div>
                    ))}
                  </div>
                </MenuItem>
              )
            })}
          </Select>
        </FormControl>
        <Button variant="outlined" color="primary" onClick={saveSwatch}>Save</Button>
      </div>
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
      <Footer shouldCenter />
    </div>
  )
}
