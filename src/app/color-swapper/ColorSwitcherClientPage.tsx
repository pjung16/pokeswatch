"use client"

import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import styles from "./styles.module.css"
import species from "../species.json"
import animationMap from "../animationMap.json"
import { MainClient, Pokemon } from "pokenode-ts"
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query"
import {
  getPokemonIcon,
  getPokemonSpriteURL,
  getShinyPokemonSprites,
  pokemonNameToQueryableName,
  rgbToHex,
  speciesToOptions,
} from "../utils"
import { Autocomplete, Button, TextField } from "@mui/material"
import { getContrastingBaseTextColor, getContrastingTextColor } from "../color"
import { cropWhitespace } from "../image"
import { useWindowDimensions } from "../hooks"
import PokeballAndLogo from "../components/PokeballAndLogo"
import Footer from "../components/Footer"
import classNames from "classnames"
import { TPokemonAnimationKey } from "../types"
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined"
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome"

const queryClient = new QueryClient()

function ColorSwitcherClientPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <Suspense>
        <ColorSwitcherContent />
      </Suspense>
    </QueryClientProvider>
  )
}

const autocompleteOptions = speciesToOptions(species)

interface ColorMapping {
  original: string
  replacement: string
}

function ColorSwitcherContent() {
  const [pokemonFromInput, setPokemonFromInput] = useState<{
    label: string
    id: number
  }>({ label: "ampharos", id: 181 })
  const [pokemonData, setPokemonData] = useState<Pokemon | undefined>(undefined)
  const [showShinySprite, setShowShinySprite] = useState<boolean>(false)
  const [isAbsoluteLoading, setIsAbsoluteLoading] = useState<boolean>(false)

  const api = new MainClient()

  const getPokemon = (): Promise<Pokemon> => {
    return api.pokemon
      .getPokemonByName(pokemonNameToQueryableName(pokemonFromInput.label))
      .then((data) => {
        setPokemonData(data)
        return data
      })
      .catch((_) => {
        return api.pokemon
          .getPokemonByName(pokemonFromInput.label)
          .then((data) => {
            setPokemonData(data)
            return data
          })
      })
  }

  const { data: dataFromApi, isLoading } = useQuery({
    queryKey: ["getPokemon", pokemonFromInput.label],
    queryFn: () => getPokemon(),
    refetchOnWindowFocus: false,
  })

  const data = dataFromApi || pokemonData

  const imgRef = useRef<HTMLImageElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [spriteImageUrl, setSpriteImageUrl] = useState<string | undefined>(
    undefined
  )
  const [extractedColors, setExtractedColors] = useState<string[]>([])
  const [colorMappings, setColorMappings] = useState<ColorMapping[]>([])
  const [modifiedImageUrl, setModifiedImageUrl] = useState<string | undefined>(
    undefined
  )

  const animationMapKey =
    animationMap[pokemonFromInput.label as TPokemonAnimationKey]

  const { width } = useWindowDimensions()
  const leftPaddingForContent =
    typeof window !== "undefined"
      ? width >= 1460
        ? width > 1512
          ? `${166 + (width - 1512) / 2}px`
          : "166px"
        : undefined
      : "0px"

  useEffect(() => {
    const img = new Image()
    imgRef.current = img
  }, [])

  useEffect(() => {
    if (pokemonData && pokemonData.name === pokemonFromInput.label) {
      setIsAbsoluteLoading(true)
      if (imgRef.current) {
        if (pokemonData.sprites.front_default) {
          imgRef.current.src = pokemonData.sprites.front_shiny
            ? showShinySprite
              ? getShinyPokemonSprites(
                  pokemonData.id,
                  animationMapKey,
                  pokemonData.sprites.front_shiny
                )
              : pokemonData.sprites.front_default
            : pokemonData.sprites.front_default
        }
      }
      if (imgRef.current) {
        imgRef.current.crossOrigin = "anonymous"
      }
    }
  }, [
    pokemonData,
    animationMapKey,
    imgRef.current,
    showShinySprite,
    pokemonFromInput.label,
  ])

  if (imgRef.current) {
    imgRef.current.onerror = () => {
      if (showShinySprite && data && imgRef.current) {
        imgRef.current.src = data.sprites.front_shiny!
      }
    }
  }

  if (imgRef.current) {
    imgRef.current.onload = async () => {
      const img = imgRef.current
      if (!img) return
      try {
        const croppedImage = await cropWhitespace(imgRef.current)
        setSpriteImageUrl(croppedImage)
      } catch (error) {
        console.error("Error cropping image:", error)
      }

      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")!

      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0, img.width, img.height)

      const imageData = ctx.getImageData(0, 0, img.width, img.height).data
      const colorCount: Record<string, number> = {}

      const roundColor = (value: number, precision: number) =>
        Math.round(value / precision) * precision

      const isSurroundedByTransparent = (x: number, y: number): boolean => {
        const index = (y * img.width + x) * 4
        if (imageData[index + 3] === 0) return true

        const neighborOffsets = [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ]

        for (const [dx, dy] of neighborOffsets) {
          const nx = x + dx
          const ny = y + dy

          if (nx >= 0 && nx < img.width && ny >= 0 && ny < img.height) {
            const ni = (ny * img.width + nx) * 4
            const alpha = imageData[ni + 3]
            if (alpha === 0) return true
          }
        }

        return false
      }

      for (let y = 0; y < img.height; y++) {
        for (let x = 0; x < img.width; x++) {
          const index = (y * img.width + x) * 4
          const r = roundColor(imageData[index], 1)
          const g = roundColor(imageData[index + 1], 1)
          const b = roundColor(imageData[index + 2], 1)
          const a = imageData[index + 3]

          if (a === 0) continue
          const brightness = (r + g + b) / 3
          if (brightness < 26.5) continue

          if (isSurroundedByTransparent(x, y) && brightness < 35) continue

          const color = `${r},${g},${b}`
          colorCount[color] = (colorCount[color] || 0) + 1
        }
      }

      const sortedColors = Object.keys(colorCount)
        .sort((a, b) => colorCount[b] - colorCount[a])
        .slice(0, 20)
        .map((color) => {
          const [r, g, b] = color.split(",").map(Number)
          return rgbToHex(r, g, b)
        })

      setExtractedColors(sortedColors)
      // Pre-populate color mappings with all extracted colors
      const initialMappings = sortedColors.map((color) => ({
        original: color,
        replacement: color,
      }))
      setColorMappings(initialMappings)
      window.setTimeout(() => setIsAbsoluteLoading(false), 500)
    }
  }

  const applyColorChanges = useCallback(async () => {
    if (!imgRef.current || !canvasRef.current || colorMappings.length === 0)
      return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")!
    const img = imgRef.current

    canvas.width = img.width
    canvas.height = img.height
    ctx.drawImage(img, 0, 0)

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data

    // Convert hex colors to RGB for comparison
    const mappings = colorMappings.map((mapping) => {
      const origRgb = hexToRgb(mapping.original)
      const replRgb = hexToRgb(mapping.replacement)
      return { original: origRgb, replacement: replRgb }
    })

    // Replace colors in image data
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const a = data[i + 3]

      if (a === 0) continue

      for (const mapping of mappings) {
        if (
          r === mapping.original.r &&
          g === mapping.original.g &&
          b === mapping.original.b
        ) {
          data[i] = mapping.replacement.r
          data[i + 1] = mapping.replacement.g
          data[i + 2] = mapping.replacement.b
          break
        }
      }
    }

    ctx.putImageData(imageData, 0, 0)

    // Create a temporary image to crop
    const tempImg = new Image()
    tempImg.src = canvas.toDataURL()
    tempImg.crossOrigin = "anonymous"

    // Wait for the image to load and then crop it
    tempImg.onload = async () => {
      try {
        const croppedImage = await cropWhitespace(tempImg)
        setModifiedImageUrl(croppedImage)
      } catch (error) {
        console.error("Error cropping modified image:", error)
        setModifiedImageUrl(canvas.toDataURL())
      }
    }
  }, [colorMappings])

  // Auto-apply color changes whenever mappings change
  useEffect(() => {
    if (colorMappings.length > 0 && imgRef.current && canvasRef.current) {
      applyColorChanges()
    }
  }, [colorMappings, applyColorChanges])

  const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
    hex = hex.replace(/^#/, "")
    const bigint = parseInt(hex, 16)
    return {
      r: (bigint >> 16) & 255,
      g: (bigint >> 8) & 255,
      b: bigint & 255,
    }
  }

  const addColorMapping = () => {
    if (extractedColors.length > 0) {
      setColorMappings([
        ...colorMappings,
        { original: extractedColors[0], replacement: extractedColors[0] },
      ])
    }
  }

  const removeColorMapping = (index: number) => {
    setColorMappings(colorMappings.filter((_, i) => i !== index))
  }

  const updateColorMapping = (
    index: number,
    field: "original" | "replacement",
    value: string
  ) => {
    const newMappings = [...colorMappings]
    newMappings[index][field] = value
    setColorMappings(newMappings)
  }

  const backgroundColor =
    extractedColors.length > 0 ? extractedColors[0] : "#D0CFCF"
  const baseFontColor = getContrastingBaseTextColor(backgroundColor)

  const style: React.CSSProperties = {
    backgroundColor: `${backgroundColor}CC`,
    color: baseFontColor,
    ["--color1" as any]: extractedColors[0] ?? "#D0CFCF",
    ["--color2" as any]: extractedColors[1] ?? "#7A7D7D",
    ["--color2-light" as any]: `${extractedColors[1] ?? "#7A7D7D"}CC`,
    ["--color3" as any]: extractedColors[2] ?? "#565254",
    ["--color4" as any]: extractedColors[3] ?? "#FFFBFE",
    ["--color4-light" as any]: `${extractedColors[3] ?? "#FFFBFE"}CC`,
  }

  const [isMounted, setIsMounted] = useState(false)
  const [optionsOpen, setOptionsOpen] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return undefined
  }

  const isAnythingLoading = isAbsoluteLoading || isLoading

  return (
    <div className={styles.app} style={style}>
      <header className={styles.appHeader}>
        <PokeballAndLogo />
        <div className={styles.pokemonTeamAndComboboxWrapper}>
          <div className={styles.comboboxContainer}>
            <Autocomplete
              open={optionsOpen}
              onOpen={() => setOptionsOpen(true)}
              onClose={() => setOptionsOpen(false)}
              autoHighlight={true}
              slotProps={{
                paper: {
                  sx: {
                    borderRadius: "0px 0px 30px 30px",
                    border: "1px solid rgba(0, 0, 0, 0.23)",
                    borderTopWidth: "0px",
                    boxShadow:
                      "0 9px 8px -3px rgba(64, 60, 67, .24), 8px 0 8px -7px rgba(64, 60, 67, .24), -8px 0 8px -7px rgba(64, 60, 67, .24)",
                  },
                },
              }}
              disablePortal
              options={autocompleteOptions}
              filterOptions={(options, state) => {
                const inputValue = state.inputValue.toLowerCase()
                return options.filter(
                  (option) =>
                    option.label.toLowerCase().includes(inputValue) ||
                    option.id.toString().includes(inputValue)
                )
              }}
              sx={{
                width: "100%",
                backgroundColor: "white",
                "& fieldset": {
                  borderRadius: optionsOpen ? "30px 30px 0px 0px" : "30px",
                },
                borderRadius: optionsOpen ? "30px 30px 0px 0px" : "30px",
              }}
              renderInput={(params) => (
                <>
                  <TextField
                    {...params}
                    sx={{
                      textTransform: "capitalize",
                      "& .MuiAutocomplete-input": {
                        textTransform: "capitalize",
                      },
                      "& .MuiOutlinedInput-root": {
                        borderRadius: optionsOpen
                          ? "30px 30px 0px 0px"
                          : "30px",
                        boxShadow: "0px 2px 8px 2px rgba(64, 60, 67, .24)",
                        paddingLeft: "16px",
                      },
                      "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline":
                        {
                          borderColor: "rgba(0, 0, 0, 0.23)",
                        },
                      "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                        {
                          borderColor: "rgba(0, 0, 0, 0.23)",
                          borderWidth: "1px",
                        },
                    }}
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0px",
                            marginRight: "-1px",
                          }}
                        >
                          <div
                            style={{
                              background: getPokemonIcon(
                                pokemonFromInput.label
                              ),
                              width: "40px",
                              height: "30px",
                              imageRendering: "pixelated",
                              transform: "scale(1.2)",
                            }}
                          />
                          <div
                            className={styles.pokemonDexNumber}
                            style={{ marginRight: "2px" }}
                          >
                            #{pokemonFromInput.id}
                          </div>
                        </div>
                      ),
                    }}
                  />
                </>
              )}
              renderOption={({ key, ...params }, option) => (
                <li
                  key={key}
                  {...params}
                  style={{ textTransform: "capitalize" }}
                >
                  <div
                    style={{
                      background: getPokemonIcon(option.label),
                      width: "40px",
                      height: "30px",
                      imageRendering: "pixelated",
                      transform: "scale(1.2)",
                      marginRight: "0.5px",
                      marginLeft: "-1px",
                    }}
                  />
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      overflow: "hidden",
                    }}
                  >
                    <div className={styles.pokemonDexNumber}>#{option.id}</div>
                    <div>{option.label}</div>
                  </div>
                </li>
              )}
              value={pokemonFromInput}
              isOptionEqualToValue={(option, value) => {
                return option.id === value.id
              }}
              onChange={(_, newValue) => {
                if (newValue) {
                  setPokemonFromInput(newValue)
                }
              }}
            />
          </div>
        </div>
      </header>
      <div
        className={styles.contentContainer}
        style={{ paddingLeft: leftPaddingForContent }}
      >
        {isAnythingLoading ? (
          <div
            className={classNames(
              styles.pokeball,
              styles.pbHyper,
              styles.loader
            )}
          >
            <div className={styles.top}></div>
            <div className={styles.button} />
          </div>
        ) : (
          <>
            <div className={styles.contentContainerTopSection}>
              <div className={styles.pokemonName}>
                {data?.name.replaceAll("-", " ")}
              </div>
              <Button
                id="toggleShinyButton"
                onClick={() => {
                  setShowShinySprite(!showShinySprite)
                }}
                sx={{
                  color: "inherit",
                  position: "relative",
                  "&:hover": {
                    backgroundColor: "rgba(255, 255, 255, 0.3)",
                  },
                  borderRadius: "50%",
                  minWidth: "35px",
                  minHeight: "35px",
                  padding: "9px",
                  marginLeft: "16px",
                }}
                size="small"
                disableRipple
              >
                {showShinySprite ? (
                  <AutoAwesomeIcon
                    style={{
                      cursor: "pointer",
                    }}
                  />
                ) : (
                  <AutoAwesomeOutlinedIcon
                    style={{
                      cursor: "pointer",
                    }}
                  />
                )}
              </Button>
            </div>
            <div className={styles.mainContent}>
              <div className={styles.spriteSection}>
                <div className={styles.spriteContainer}>
                  <h3>Original Sprite</h3>
                  {spriteImageUrl && (
                    <img
                      src={spriteImageUrl}
                      crossOrigin="anonymous"
                      alt="pokemon"
                      className={styles.pokemonSprite}
                    />
                  )}
                </div>
                <div className={styles.spriteContainer}>
                  <h3>Modified Sprite</h3>
                  {modifiedImageUrl ? (
                    <img
                      src={modifiedImageUrl}
                      alt="modified pokemon"
                      className={styles.pokemonSprite}
                    />
                  ) : (
                    spriteImageUrl && (
                      <img
                        src={spriteImageUrl}
                        crossOrigin="anonymous"
                        alt="pokemon"
                        className={styles.pokemonSprite}
                      />
                    )
                  )}
                </div>
              </div>
              <div className={styles.controlsSection}>
                <h3>Color Mappings</h3>
                <div className={styles.colorMappingsGrid}>
                  {colorMappings.map((mapping, index) => (
                    <div key={index} className={styles.colorMappingCard}>
                      <div className={styles.colorDisplayRow}>
                        <div
                          className={styles.colorSwatch}
                          style={{ backgroundColor: mapping.original }}
                          title={mapping.original}
                        />
                        <span className={styles.arrow}>→</span>
                        <div
                          className={styles.colorSwatch}
                          style={{ backgroundColor: mapping.replacement }}
                          title={mapping.replacement}
                        />
                      </div>
                      <div className={styles.colorInputs}>
                        <input
                          type="color"
                          value={mapping.replacement}
                          onChange={(e) =>
                            updateColorMapping(
                              index,
                              "replacement",
                              e.target.value
                            )
                          }
                          className={styles.colorInput}
                        />
                        <span className={styles.colorCode}>
                          {mapping.replacement}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      <canvas ref={canvasRef} style={{ display: "none" }} />
      <Footer shouldCenter />
    </div>
  )
}

export default ColorSwitcherClientPage
