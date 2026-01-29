"use client"

import React, {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import styles from "./styles.module.css"
import species from "../species.json"
import animationMap from "../animationMap.json"
import { MainClient, Pokemon, PokemonSpecies } from "pokenode-ts"
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query"
import {
  getPokemonIcon,
  pokemonFormsToExclude,
  pokemonFormsWithNoShinySprite,
  pokemonNameToQueryableName,
  rgbToHex,
  shouldHaveFormSelector,
  speciesToOptions,
} from "../utils"
import { Autocomplete, Button, FormControl, MenuItem, Select, TextField } from "@mui/material"
import { getContrastingBaseTextColor, getContrastingTextColor } from "../color"
import { cropWhitespace } from "../image"
import { useWindowDimensions } from "../hooks"
import PokeballAndLogo from "../components/PokeballAndLogo"
import SettingsMenu from "../components/SettingsMenu"
import Footer from "../components/Footer"
import classNames from "classnames"
import { TPokemonAnimationKey } from "../types"
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined"
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome"
import DownloadIcon from "@mui/icons-material/Download"
import axios from "axios"
import { IPokemonColorsResponseData } from "@/types/PokemonColorResponseData"
import api from "../api/api"
import throttle from "lodash.throttle"

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
  const [selectedForm, setSelectedForm] = useState<string | undefined>(undefined)
  const [showShinySprite, setShowShinySprite] = useState<boolean>(false)
  const [isAbsoluteLoading, setIsAbsoluteLoading] = useState<boolean>(false)

  const PokeApi = new MainClient()

  // The active Pokemon name - either the selected form or the base Pokemon
  const activePokemonName = selectedForm ?? pokemonFromInput.label

  // Only fetch base Pokemon data (for forms list)
  const getBasePokemon = (): Promise<Pokemon> => {
    return PokeApi.pokemon
      .getPokemonByName(pokemonNameToQueryableName(pokemonFromInput.label))
      .then((data) => data)
      .catch((_) => {
        return PokeApi.pokemon.getPokemonByName(pokemonFromInput.label)
      })
  }

  // Only fetch species data for base Pokemon (for varieties list)
  const getPokemonSpecies = (): Promise<PokemonSpecies | undefined> => {
    return PokeApi.pokemon
      .getPokemonSpeciesByName(pokemonFromInput.label)
      .then((data) => data)
      .catch((error) => {
        console.error(error)
        return undefined
      })
  }

  const { data: basePokemonData, isLoading } = useQuery({
    queryKey: ["getBasePokemon", pokemonFromInput.label],
    queryFn: () => getBasePokemon(),
    refetchOnWindowFocus: false,
  })

  const { data: speciesData } = useQuery({
    queryKey: ["getPokemonSpecies", pokemonFromInput.label],
    queryFn: () => getPokemonSpecies(),
    refetchOnWindowFocus: false,
  })

  // Reset selected form when Pokemon changes
  useEffect(() => {
    setSelectedForm(undefined)
  }, [pokemonFromInput.label])

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
    animationMap[activePokemonName as TPokemonAnimationKey]

  const [pokemonColorData, setPokemonColorData] = useState<IPokemonColorsResponseData | undefined>(undefined)

  useEffect(() => {
    const img = new Image()
    imgRef.current = img
  }, [])

  const fetchPokemonColors = useCallback(async (isShiny: boolean) => {
    setIsAbsoluteLoading(true)
    const pokemonName = pokemonNameToQueryableName(activePokemonName)
    api.get<IPokemonColorsResponseData>(`/pokemon-colors/${pokemonName}?shiny=${isShiny}`)
      .then((response) => {
        setPokemonColorData(response.data)
        if (imgRef.current) {
          const folder = response.data.isShiny ? 'shiny' : 'normal'
          const spritePath = `/sprites/${folder}/${response.data.filename}`
          imgRef.current.src = spritePath
          imgRef.current.crossOrigin = "anonymous"
        }
        // Extract hex colors from API response
        const hexColors = response.data.colors.map(c => c.color)
        setExtractedColors(hexColors)
        // Pre-populate color mappings with all extracted colors
        const initialMappings = hexColors.map((color) => ({
          original: color,
          replacement: color,
        }))
        setColorMappings(initialMappings)
        window.setTimeout(() => setIsAbsoluteLoading(false), 500)
      })
      .catch((error) => {
        console.error(error)
        setPokemonColorData(undefined)
        setIsAbsoluteLoading(false)
      })
  }, [activePokemonName])

  useEffect(() => {
    fetchPokemonColors(showShinySprite)
  }, [activePokemonName, showShinySprite, fetchPokemonColors])

  // Handle image load for cropping (sprite image still needs cropping for display)
  useEffect(() => {
    if (!imgRef.current) return

    imgRef.current.onload = async () => {
      const img = imgRef.current
      if (!img) return
      try {
        const croppedImage = await cropWhitespace(imgRef.current)
        setSpriteImageUrl(croppedImage)
      } catch (error) {
        console.error("Error cropping image:", error)
      }
    }
  }, [pokemonFromInput.label])

  const applyColorChanges = useCallback(async () => {
    if (!imgRef.current || !canvasRef.current || colorMappings.length === 0)
      return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")!
    const img = imgRef.current

    // Check if image is fully loaded and has valid dimensions
    if (!img.complete || img.naturalWidth === 0 || img.naturalHeight === 0) {
      console.warn("Image not loaded yet, waiting...")
      // Wait for image to load using addEventListener (doesn't overwrite existing onload)
      await new Promise<void>((resolve) => {
        const handleLoad = () => {
          img.removeEventListener("load", handleLoad)
          resolve()
        }
        img.addEventListener("load", handleLoad)
        // If already complete, resolve immediately
        if (img.complete && img.naturalWidth > 0) {
          img.removeEventListener("load", handleLoad)
          resolve()
        }
      })
    }

    // Use naturalWidth/Height for actual image dimensions
    canvas.width = img.naturalWidth || img.width
    canvas.height = img.naturalHeight || img.height
    
    if (canvas.width === 0 || canvas.height === 0) {
      console.error("Cannot apply color changes: image has no dimensions")
      return
    }
    
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

  const downloadModifiedSprite = useCallback(() => {
    if (!modifiedImageUrl) return

    const link = document.createElement("a")
    link.href = modifiedImageUrl
    link.download = `${activePokemonName}${showShinySprite ? "-shiny" : ""}-modified.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [modifiedImageUrl, activePokemonName, showShinySprite])

  const removeColorMapping = (index: number) => {
    setColorMappings(colorMappings.filter((_, i) => i !== index))
  }

  const updateColorMapping = useRef(
    throttle((
      index: number,
      field: "original" | "replacement",
      value: string
    ) => {
      setColorMappings(prev => {
        const newMappings = [...prev];
        newMappings[index][field] = value;
        return newMappings;
      });
    }, 50, { leading: false, trailing: true })
  ).current

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
        <div style={{ display: "flex", alignItems: "center", width: "100%", justifyContent: "space-between" }}>
          <PokeballAndLogo />
          <SettingsMenu className={styles.settingsIcon} iconColor="black" />
        </div>
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
                {activePokemonName.replaceAll("-", " ")}
              </div>
              {!pokemonFormsWithNoShinySprite.includes(activePokemonName) && <Button
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
              </Button>}
              {speciesData &&
                basePokemonData &&
                (speciesData.varieties.length > 1 ||
                  basePokemonData.forms.length > 1) &&
                shouldHaveFormSelector(pokemonFromInput.label) && (
                  <FormControl sx={{ ml: "25px", minWidth: 120 }}>
                    <Select
                      value={selectedForm ?? basePokemonData?.name}
                      sx={{
                        color: "inherit",
                        "& .MuiOutlinedInput-notchedOutline": {
                          borderColor: "inherit",
                        },
                        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                          borderColor: "inherit",
                        },
                        "&:hover .MuiOutlinedInput-notchedOutline": {
                          borderColor: "inherit",
                        },
                      }}
                    >
                      {speciesData?.varieties.map((v) => {
                        const parsedFormName = v.pokemon.name
                          .split(`${pokemonFromInput.label.toLowerCase()}-`)
                          .slice(1)
                        return (
                          parsedFormName[0] !== "totem" &&
                          !pokemonFormsToExclude.includes(v.pokemon.name) && (
                            <MenuItem
                              key={v.pokemon.name}
                              onClick={() => {
                                if (v.is_default) {
                                  setSelectedForm(undefined)
                                } else {
                                  setSelectedForm(v.pokemon.name)
                                }
                              }}
                              style={{ textTransform: "capitalize" }}
                              value={v.pokemon.name}
                            >
                              {v.is_default ? "Default" : parsedFormName} Form
                            </MenuItem>
                          )
                        )
                      })}
                      {(
                        ((basePokemonData?.forms ?? []).length
                          ? // we're excluding the default form from the forms list
                            basePokemonData?.forms.slice(1)
                          : basePokemonData?.forms) ?? []
                      ).map((f, idx) => (
                        !pokemonFormsToExclude.includes(f.name) && (
                          <MenuItem
                            key={f.name}
                            onClick={() => {
                              if (
                                idx === 0 &&
                                !(basePokemonData?.forms ?? []).length
                              ) {
                                setSelectedForm(undefined)
                              } else {
                                setSelectedForm(f.name)
                              }
                            }}
                            style={{ textTransform: "capitalize" }}
                            value={f.name}
                          >
                            {idx === 0 && !(basePokemonData?.forms ?? []).length
                              ? "Default"
                              : f.name
                                  .split(
                                    `${pokemonFromInput.label.toLowerCase()}-`
                                  )
                                  .slice(1)}{" "}
                            Form
                          </MenuItem>
                          )
                        )
                      )}
                    </Select>
                  </FormControl>
                )}
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
                  {modifiedImageUrl && (
                    <Button
                      onClick={downloadModifiedSprite}
                      variant="outlined"
                      startIcon={<DownloadIcon />}
                      sx={{
                        mt: 2,
                        color: "inherit",
                        borderColor: "inherit",
                        textTransform: "none",
                        "&:hover": {
                          borderColor: "inherit",
                          backgroundColor: "rgba(255, 255, 255, 0.1)",
                        },
                      }}
                    >
                      Download
                    </Button>
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
