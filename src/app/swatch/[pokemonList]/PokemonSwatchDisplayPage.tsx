"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  getPokemonIcon,
  isPrismaCuid,
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
import { IDeleteSwatchResponse, ISwatch } from "@/types/swatch"
import api from "@/app/api/api"
import { IPokemonColorsResponseData } from "@/types/PokemonColorResponseData"
import DeleteIcon from "@mui/icons-material/Delete"

const validPokemonSet = new Set([
  ...Object.keys(BattlePokemonIconIndexes),
  ...Object.keys(pokemonWithHyphens),
])

const queryClient = new QueryClient()

export default function PokemonSwatchDisplayPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <PokemonTeamPage />
    </QueryClientProvider>
  )
}

function PokemonTeamPage() {
  const { pokemonList: routeParam } = useParams<{ pokemonList: string }>()
  const router = useRouter()
  const { colorFormat, showAnimations } = useSwatchPageContext()

  // Track current param locally so we can update URL without Next.js navigation
  const [currentParam, setCurrentParam] = useState<string>(routeParam)
  const isSavedSwatch = isPrismaCuid(currentParam)

  // --- Saved swatch state ---
  const [swatch, setSwatch] = useState<ISwatch | null>(null)

  const fetchSwatch = useCallback(async (swatchId: string) => {
    api.get<ISwatch>(`/swatches/${swatchId}`)
      .then((response) => {
        setSwatch(response.data)
      })
  }, [])

  useEffect(() => {
    if (isSavedSwatch) {
      fetchSwatch(currentParam)
    }
  }, [isSavedSwatch, currentParam, fetchSwatch])

  // --- URL-based swatch state ---
  const [currentPokemonList, setCurrentPokemonList] = useState<string>(routeParam)

  useEffect(() => {
    if (!isSavedSwatch) {
      setCurrentPokemonList(window.location.pathname.replace('/swatch/', ''))
    }
  }, [isSavedSwatch, window.location.pathname])

  // --- Parsed pokemon (unified) ---
  const parsedPokemon = useMemo(() => {
    if (isSavedSwatch) {
      return swatch?.pokemon ? parsePokemonUrlPath(swatch.pokemon, validPokemonSet) : []
    }
    return currentPokemonList ? parsePokemonUrlPath(currentPokemonList, validPokemonSet) : []
  }, [isSavedSwatch, swatch, currentPokemonList])

  // --- Route update handler ---
  const updatePokemonRoute = (
    currentUrl: string,
    oldPokemonName: string,
    newPokemonName: string
  ) => {
    const newPokemonList = currentUrl?.replace(oldPokemonName, newPokemonName)
    if (!isSavedSwatch) {
      setCurrentPokemonList(newPokemonList.replace('/swatch/', ''))
    }
    window.history.pushState({}, "", `${newPokemonList}`)
  }

  // --- Fill / trim logic (URL-based only) ---
  useEffect(() => {
    if (isSavedSwatch) return

    if (parsedPokemon.length < 6) {
      const additionalPokemon: string[] = []
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

    if (parsedPokemon.length > 6) {
      const trimmedPokemon = parsedPokemon.slice(0, 6)
      router.push(`/swatch/${trimmedPokemon.join("-")}`)
    }
  }, [isSavedSwatch, parsedPokemon, router.push])

  // --- Normalize queryable names (URL-based only) ---
  useEffect(() => {
    if (isSavedSwatch) return

    const pokemonWithQueryableNames = parsedPokemon.map((p) =>
      pokemonNameToQueryableName(p)
    )
    if (!R.equals(pokemonWithQueryableNames, parsedPokemon)) {
      router.push(`/swatch/${pokemonWithQueryableNames.join("-")}`)
    }
  }, [isSavedSwatch, router.push, parsedPokemon])

  // --- Swatch selector state (shared) ---
  const [swatches, setSwatches] = useState<ISwatch[]>([])
  const [selectedSwatch, setSelectedSwatch] = useState<string>("")

  useEffect(() => {
    if (isSavedSwatch) {
      setSelectedSwatch(currentParam)
    }
  }, [isSavedSwatch, currentParam])

  const fetchSwatches = useCallback(async () => {
    api.get<ISwatch[]>('/swatches')
      .then((response) => {
        setSwatches(response.data)
      })
      .catch((error) => {
        console.error(error)
      })
  }, [])

  const saveSwatch = useCallback(async () => {
    const pokemonPayload = isSavedSwatch ? swatch?.pokemon : currentPokemonList
    api.post<ISwatch>('/swatches', {
      pokemon: pokemonPayload,
    })
      .then((response) => {
        fetchSwatches()
        // Update URL without Next.js navigation to avoid re-mounting pokemon
        setSwatch(response.data)
        setCurrentParam(response.data.id)
        setSelectedSwatch(response.data.id)
        window.history.pushState({}, "", `/swatch/${response.data.id}`)
      })
  }, [isSavedSwatch, swatch?.pokemon, currentPokemonList, fetchSwatches])

  const onSwatchSelect = useCallback((e: SelectChangeEvent<string>) => {
    const selectedId = e.target.value
    setSelectedSwatch(selectedId)
    const selected = swatches.find((s) => s.id === selectedId)
    if (selected) {
      // Update state + URL without Next.js navigation
      setSwatch(selected)
      setCurrentParam(selected.id)
      window.history.pushState({}, "", `/swatch/${selected.id}`)
    }
  }, [swatches])

  useEffect(() => {
    fetchSwatches()
  }, [fetchSwatches])

  // --- Swatch colors for dropdown preview ---
  const [savedSwatchPokemonAndColors, setSavedSwatchPokemonAndColors] = useState<
    Array<{ id: string; pokemon: { pokemonName: string; colors: IPokemonColorsResponseData["colors"] }[] }>
  >([])

  const deleteSwatch = useCallback(async (id: string) => {
    api.delete<IDeleteSwatchResponse>(`/swatches/${id}`)
    setSavedSwatchPokemonAndColors(savedSwatchPokemonAndColors.filter(s => s.id !== id))
    if (currentParam === id) {
      // Navigate away since the current swatch was deleted
      router.push("/swatch")
    }
  }, [savedSwatchPokemonAndColors, currentParam, router])

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

  const selectValue = isSavedSwatch ? currentParam : selectedSwatch

  return (
    <div>
      <div className={styles.swatchSelectorContainer}>
        <FormControl fullWidth>
          <InputLabel id="swatch">Swatch</InputLabel>
          <Select
            labelId="demo-simple-select-label"
            id="demo-simple-select"
            value={selectValue}
            label="Swatch"
            onChange={onSwatchSelect}
            renderValue={(value) => {
              const selected = savedSwatchPokemonAndColors.find((s) => s.id === value)
              if (!selected) return null
              return (
                <div style={{ display: "flex", width: "100%", height: "40px", justifyContent: "space-evenly" }}>
                  {selected.pokemon.map((pokemon, idx) => (
                    <div key={`${pokemon.pokemonName}-${idx}`} style={{ width: "100%", display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: pokemon.colors[0].color }}>
                      <div style={{ background: getPokemonIcon(pokemon.pokemonName.replaceAll("-", "")), width: "40px", height: "30px", imageRendering: "pixelated", transform: "scale(1.2)" }} />
                    </div>
                  ))}
                </div>
              )
            }}
          >
            {savedSwatchPokemonAndColors.map((swatch) => {
              return (
                <MenuItem key={swatch.id} value={swatch.id}>
                  <div style={{ display: "flex", width: "100%", height: "40px", justifyContent: "space-evenly" }}>
                    {swatch.pokemon.map((pokemon, idx) => (
                      <div key={`${pokemon.pokemonName}-${idx}`} style={{ width: "100%", display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: pokemon.colors[0].color }}>
                        <div style={{ background: getPokemonIcon(pokemon.pokemonName.replaceAll("-", "")), width: "40px", height: "30px", imageRendering: "pixelated", transform: "scale(1.2)" }} />
                      </div>
                    ))}
                  </div>
                  <DeleteIcon
                    onClick={(e: React.MouseEvent<SVGSVGElement>) => {
                      e.stopPropagation()
                      deleteSwatch(swatch.id)
                    }}
                    style={{ cursor: "pointer", marginLeft: "10px" }}
                  />
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
