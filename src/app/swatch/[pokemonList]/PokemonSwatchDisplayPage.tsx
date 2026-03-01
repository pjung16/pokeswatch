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

interface ISwatchExportSlot {
  pokemonName: string
  spriteUrl: string
  colors: string[]
}

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
  const { colorFormat, showAnimations, setSwatchDownloadHandler } = useSwatchPageContext()
  const sanitizePokemonList = useCallback((value: string) => {
    const cleaned = value.replace("/swatch/", "")
    const parts = cleaned.split("-").filter(Boolean)
    if (parts.length > 0 && isPrismaCuid(parts[0])) {
      return parts.slice(1).join("-")
    }
    return cleaned
  }, [])

  // Track current param locally so we can update URL without Next.js navigation
  const [currentParam, setCurrentParam] = useState<string>(routeParam)
  const isSavedSwatch = isPrismaCuid(currentParam)
  const isSavedSwatchLikeRoute = isSavedSwatch || isPrismaCuid(currentParam.split("-")[0])

  // Keep local route param in sync when user navigates via router/back-forward.
  useEffect(() => {
    setCurrentParam(routeParam)
  }, [routeParam])

  // Keep local param in sync for browser back/forward after pushState updates.
  useEffect(() => {
    const syncFromLocation = () => {
      setCurrentParam(window.location.pathname.replace("/swatch/", ""))
    }

    window.addEventListener("popstate", syncFromLocation)
    return () => window.removeEventListener("popstate", syncFromLocation)
  }, [])

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
    if (isSavedSwatch) {
      // Saved swatch routes are IDs, so derive the editable list from swatch pokemon.
      const sourcePokemonList = sanitizePokemonList(swatch?.pokemon ?? currentPokemonList)
      const updatedPokemonList = sourcePokemonList.replace(oldPokemonName, newPokemonName)
      setCurrentParam(updatedPokemonList)
      setCurrentPokemonList(updatedPokemonList)
      setSelectedSwatch("")
      setSwatch(null)
      window.history.pushState({}, "", `/swatch/${updatedPokemonList}`)
      return
    }

    const sourcePokemonList = sanitizePokemonList(currentPokemonList || currentUrl)
    const updatedPokemonList = sourcePokemonList.replace(oldPokemonName, newPokemonName)
    setCurrentParam(updatedPokemonList)
    setCurrentPokemonList(updatedPokemonList)
    window.history.pushState({}, "", `/swatch/${updatedPokemonList}`)
  }

  // --- Fill / trim logic (URL-based only) ---
  useEffect(() => {
    if (isSavedSwatchLikeRoute) return

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
  }, [isSavedSwatchLikeRoute, parsedPokemon, router.push])

  // --- Normalize queryable names (URL-based only) ---
  useEffect(() => {
    if (isSavedSwatchLikeRoute) return

    const pokemonWithQueryableNames = parsedPokemon.map((p) =>
      pokemonNameToQueryableName(p)
    )
    if (!R.equals(pokemonWithQueryableNames, parsedPokemon)) {
      router.push(`/swatch/${pokemonWithQueryableNames.join("-")}`)
    }
  }, [isSavedSwatchLikeRoute, router.push, parsedPokemon])

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
    if (isSavedSwatch) return
    const pokemonPayload = currentPokemonList
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
  }, [isSavedSwatch, currentPokemonList, fetchSwatches])

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
  const [swatchExportSlots, setSwatchExportSlots] = useState<(ISwatchExportSlot | null)[]>([])

  useEffect(() => {
    setSwatchExportSlots(new Array(parsedPokemon.length).fill(null))
  }, [parsedPokemon.length])

  const onSwatchExportDataChange = useCallback((slotIndex: number, data: ISwatchExportSlot) => {
    setSwatchExportSlots((prev) => {
      const next = [...prev]
      if (next.length < parsedPokemon.length) {
        while (next.length < parsedPokemon.length) next.push(null)
      }
      next[slotIndex] = data
      return next
    })
  }, [parsedPokemon.length])

  const downloadSwatchPng = useCallback(async () => {
    if (parsedPokemon.length === 0) return
    const slots = swatchExportSlots.slice(0, parsedPokemon.length)
    if (slots.some((slot) => !slot || !slot.spriteUrl || slot.colors.length < 3)) return

    const cellWidth = 420
    const cellHeight = 300
    const cols = 3
    const rows = 2
    const gap = 0
    const padding = 0
    const width = cols * cellWidth + (cols - 1) * gap
    const height = rows * cellHeight + (rows - 1) * gap

    const canvas = document.createElement("canvas")
    const dpr = 2
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.scale(dpr, dpr)
    ctx.imageSmoothingEnabled = false

    const loadImage = (src: string) =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image()
        img.src = src
        img.crossOrigin = "anonymous"
        img.onload = () => resolve(img)
        img.onerror = reject
      })

    const spriteImages = await Promise.all(
      slots.map(async (slot) => loadImage(slot!.spriteUrl))
    )

    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i]!
      const img = spriteImages[i]
      const col = i % cols
      const row = Math.floor(i / cols)
      const x = padding + col * (cellWidth + gap)
      const y = padding + row * (cellHeight + gap)

      const stripeWidth = Math.ceil(cellWidth / 3)
      for (let c = 0; c < 3; c++) {
        ctx.fillStyle = slot.colors[c] ?? slot.colors[0] ?? "#ffffff"
        ctx.fillRect(x + c * stripeWidth, y, stripeWidth, cellHeight)
      }

      const maxSpriteW = cellWidth * 0.465
      const maxSpriteH = cellHeight * 0.465
      const ratio = Math.min(maxSpriteW / img.width, maxSpriteH / img.height)
      const drawW = img.width * ratio
      const drawH = img.height * ratio
      const drawX = x + (cellWidth - drawW) / 2
      const drawY = y + (cellHeight - drawH) / 2
      ctx.drawImage(img, drawX, drawY, drawW, drawH)
    }

    const link = document.createElement("a")
    link.href = canvas.toDataURL("image/png", 1.0)
    link.download = "pokemon-swatch.png"
    link.click()
  }, [parsedPokemon.length, swatchExportSlots])

  useEffect(() => {
    setSwatchDownloadHandler(() => downloadSwatchPng)
    return () => setSwatchDownloadHandler(null)
  }, [downloadSwatchPng, setSwatchDownloadHandler])

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
                  {selected.pokemon.map((pokemon, idx) => {
                    const pokemonName = Object.keys(pokemonWithHyphens).find(key => key === pokemon.pokemonName.replaceAll("-", "")) ? pokemon.pokemonName : pokemon.pokemonName.replaceAll("-", "")
                    return <div key={`${pokemon.pokemonName}-${idx}`} style={{ width: "100%", display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: pokemon.colors[0].color }}>
                      <div style={{ background: getPokemonIcon(pokemonName), width: "40px", height: "30px", imageRendering: "pixelated", transform: "scale(1.2)" }} />
                    </div>
                  })}
                </div>
              )
            }}
          >
            {savedSwatchPokemonAndColors.map((swatch) => {
              return (
                <MenuItem key={swatch.id} value={swatch.id}>
                  <div style={{ display: "flex", width: "100%", height: "40px", justifyContent: "space-evenly" }}>
                    {swatch.pokemon.map((pokemon, idx) => {
                      const pokemonName = Object.keys(pokemonWithHyphens).find(key => key === pokemon.pokemonName.replaceAll("-", "")) ? pokemon.pokemonName : pokemon.pokemonName.replaceAll("-", "")
                      return <div key={`${pokemon.pokemonName}-${idx}`} style={{ width: "100%", display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: pokemon.colors[0].color }}>
                        <div style={{ background: getPokemonIcon(pokemonName), width: "40px", height: "30px", imageRendering: "pixelated", transform: "scale(1.2)" }} />
                      </div>
                    })}
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
        <Button
          variant="outlined"
          color="primary"
          onClick={saveSwatch}
          disabled={isSavedSwatch}
        >
          Save
        </Button>
      </div>
      <div className={styles.pokemonSwatchContainer}>
        {parsedPokemon.map((name, idx) => (
          <PokemonSwatch
            key={`${name}-${idx}`}
            slotIndex={idx}
            pokemon={name}
            updatePokemonRoute={updatePokemonRoute}
            colorFormat={colorFormat}
            showAnimations={showAnimations}
            onExportDataChange={onSwatchExportDataChange}
          />
        ))}
      </div>
      <Footer shouldCenter />
    </div>
  )
}
