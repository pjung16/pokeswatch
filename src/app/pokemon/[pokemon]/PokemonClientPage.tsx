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
import species from "../../species.json"
import animationMap from "../../animationMap.json"
import audioMap from "../../audioMap.json"
import {
  Ability,
  EvolutionChain,
  MainClient,
  Pokemon,
  PokemonAbility,
} from "pokenode-ts"
import {
  useQuery,
  QueryClient,
  QueryClientProvider,
  useMutation,
} from "@tanstack/react-query"
import {
  formattedColor,
  getPokemonIcon,
  getPokemonSpriteURL,
  getShinyPokemonSprites,
  pokemonFormsToExclude,
  pokemonNameToQueryableName,
  rgbToHex,
  shouldHaveFormSelector,
  speciesToOptions,
  statToDisplay,
} from "../../utils"
import {
  Autocomplete,
  Button,
  FormControl,
  ListSubheader,
  Menu,
  MenuItem,
  Select,
  TextField,
} from "@mui/material"
import {
  getContrastingBaseTextColor,
  getContrastingBrightness,
  getContrastingTextColor,
  getMostUniqueColors,
  orderByLuminance,
} from "../../color"
import { cropWhitespace } from "../../image"
import { RightDrawerContent } from "./RightDrawerContent"
import { DSTooltip } from "../../components/DSTooltip"
import ImageGenerator from "../../components/ImageGenerator"
import {
  usePlaySoundOnUrlChange,
  usePokemonNavigate,
  useWindowDimensions,
} from "../../hooks"
import ColorStrip from "../../components/ColorStrip"
import CopyToClipboard from "../../components/CopyToClipboard"
import SettingsIcon from "@mui/icons-material/Settings"
import CatchingPokemonTwoToneIcon from "@mui/icons-material/CatchingPokemonTwoTone"
import AddCircleIcon from "@mui/icons-material/AddCircle"
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined"
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome"
import ContentCopyIcon from "@mui/icons-material/ContentCopy"
import PokemonSpriteAnimator, {
  AnimationData,
} from "../../components/PokemonSpriteAnimator"
import { trackPokemonSearch } from "../../firebase/trackPokemonSearch"
import { waitForAuth } from "../../firebase/utils"
import {
  TColorData,
  TColorFormat,
  TPokemon,
  TPokemonAnimationKey,
  TPokemonAudioKey,
  TTab,
} from "../../types"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import classNames from "classnames"
import { usePokemonPageContext } from "../context/PokemonPageContext"
import ListboxComponent from "@/app/components/VirtualizedListboxComponent"
// Create a client
const queryClient = new QueryClient()

function PokemonClientPage({
  params: { pokemon },
  children,
}: {
  params: { pokemon: string }
  children: React.ReactNode
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <Suspense>
        <PokemonData params={{ pokemon }} children={children} />
      </Suspense>
    </QueryClientProvider>
  )
}

const autocompleteOptions = speciesToOptions(species)

function PokemonData({
  params: { pokemon },
  children,
}: {
  params: { pokemon: string }
  children: React.ReactNode
}) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const createQueryString = useCallback(
    (paramsArray: { name: string; value: string }[]) => {
      const params = new URLSearchParams()
      paramsArray.forEach(({ name, value }) => {
        params.set(name, value)
      })

      return params.toString()
    },
    [searchParams]
  )
  const [tab, setTab] = useState<TTab>("types")

  const [showShinySprite, setShowShinySprite] = useState<boolean>(false)

  useEffect(() => {
    const isShiny = searchParams.get("isShiny")
    if (isShiny === "true") {
      setShowShinySprite(true)
    } else {
      setShowShinySprite(false)
    }
  }, [searchParams])

  const [isAbsoluteLoading, setIsAbsoluteLoading] = useState<boolean>(false)

  // const queryClient = useQueryClient()
  const api = new MainClient()

  const getPokemon = (overrideName?: string): Promise<Pokemon> => {
    return api.pokemon
      .getPokemonByName(
        pokemonNameToQueryableName(
          overrideName ?? pokemonForm ?? pokemon ?? pokemonFromInput.label
        )
      )
      .then((data) => {
        setPokemonData(data)
        return data
      })
      .catch((_) => {
        return getPokemon(pokemon ?? pokemonFromInput.label)
      })
  }

  const getPokemonSpecies = () => {
    return api.pokemon
      .getPokemonSpeciesByName(pokemonFromInput.label)
      .then((data) => data)
      .catch((error) => console.error(error))
  }

  const getPokemonEvolution = (evolutionId: number | undefined) => {
    return api.evolution
      .getEvolutionChainById(evolutionId ?? 1)
      .then((data) => {
        setPokemonEvolutionData(data)
        return data
      })
      .catch((error) => console.error(error))
  }

  const getPokemonAbility = (abilityName: string) => {
    return api.pokemon
      .getAbilityByName(abilityName)
      .then((data) => data)
      .catch((error) => console.error(error))
  }

  const initPokemonFromURL = (pokemon: string | undefined) => {
    if (pokemon && species[pokemon as TPokemon]) {
      return {
        label: pokemon,
        id: species[pokemon as TPokemon],
      }
    }
    return undefined
  }

  const {
    colorData,
    setColorData,
    colorFormat,
    setColorFormat,
    showAnimations,
    setShowAnimations,
    playPokemonCries,
    setPlayPokemonCries,
  } = usePokemonPageContext()
  // const [colorData, setColorData] = useState<TColorData[]>([])
  const [pokemonFromInput, setPokemonFromInput] = useState<{
    label: string
    id: number
  }>(initPokemonFromURL(pokemon) ?? { label: "ampharos", id: 181 })
  const [pokemonData, setPokemonData] = useState<Pokemon | undefined>(undefined)
  const [pokemonEvolutionData, setPokemonEvolutionData] = useState<
    EvolutionChain | undefined
  >(undefined)
  const [pokemonForm, setPokemonForm] = useState<string | undefined>(undefined)
  const [pokemonAbilities, setPokemonAbilities] = useState<Ability[]>([])
  const { navigate } = usePokemonNavigate(setIsAbsoluteLoading)

  const chooseRandomPokemon = () => {
    const randomNumber = Math.floor(Math.random() * 1025) + 1
    const randomPokemon = autocompleteOptions.find(
      (ao) => ao.id === randomNumber
    )
    if (randomPokemon) {
      navigate(`/pokemon/${randomPokemon.label}`)
    }
  }

  // Queries
  const { data: dataFromApi, isLoading } = useQuery({
    queryKey: ["getPokemon", pokemon, pokemonFromInput.label, pokemonForm],
    queryFn: () => getPokemon(),
    refetchOnWindowFocus: false,
  })

  const { data: speciesData, isLoading: speciesIsLoading } = useQuery({
    queryKey: [
      "getPokemonSpecies",
      pokemon,
      pokemonFromInput.label,
      pokemonForm,
    ],
    queryFn: getPokemonSpecies,
    refetchOnWindowFocus: false,
  })

  const { isLoading: evolutionIsLoading } = useQuery({
    queryKey: ["getPokemonEvolution", speciesData],
    queryFn: () =>
      getPokemonEvolution(
        parseInt(speciesData?.evolution_chain.url.split("/").at(-2) ?? "1")
      ),
    refetchOnWindowFocus: false,
  })

  const { mutateAsync: abilityMutate } = useMutation({
    mutationFn: getPokemonAbility,
    onSuccess: (data) => {
      setPokemonAbilities((prev) => {
        if (data) {
          prev.push(data)
        }
        return prev
      })
    },
  })

  const getAbilities = useCallback(
    (abilities: PokemonAbility[]) => {
      abilities.forEach((ability) => {
        abilityMutate(ability.ability.name)
      })
    },
    [abilityMutate]
  )

  useEffect(() => {
    if (pokemonData) {
      getAbilities(pokemonData.abilities)
    }
  }, [pokemonData, getAbilities])

  const imgRef = useRef<HTMLImageElement | null>(null)

  useEffect(() => {
    const img = new Image()
    imgRef.current = img
  }, [])
  // const officialImage = useMemo(() => new Image(), [])
  const [spriteImageUrl, setSpriteImageUrl] = useState<string | undefined>(
    undefined
  )
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [officialImageUrl, setOfficialImageUrl] = useState<string | undefined>(
    undefined
  )

  const hasForm = !!pokemonForm

  const animationMapKey =
    animationMap[
      (pokemonForm ?? pokemonFromInput.label) as TPokemonAnimationKey
    ]

  useEffect(() => {
    if (
      pokemonData &&
      // pokemonData.sprites.front_default &&
      (pokemonData.name ===
        (pokemonForm ?? pokemon ?? pokemonFromInput.label) ||
        (hasForm && pokemonData.name === pokemon) ||
        pokemonData.species.name ===
          (pokemonForm ?? pokemon ?? pokemonFromInput.label))
      // data.sprites.other['official-artwork'].front_default
    ) {
      setIsAbsoluteLoading(true)
      if (pokemonForm) {
        const imgUrl =
          "https://cdn.jsdelivr.net/gh/PokeAPI/sprites@613b7d0/sprites/pokemon/" +
          (showShinySprite ? "shiny/" : "") +
          pokemonData?.id +
          pokemonForm?.replace(pokemonData?.name ?? "", "") +
          ".png"
        const imgUrl2 = `https://cdn.jsdelivr.net/gh/pagefaultgames/pokerogue@02cac77/public/images/pokemon/${animationMapKey}.png`
        if (imgRef.current) {
          imgRef.current.src = showShinySprite
            ? getShinyPokemonSprites(
                pokemonFromInput.id,
                animationMapKey,
                imgUrl
              )
            : getPokemonSpriteURL(
                pokemonForm ?? pokemonData?.name ?? pokemon,
                pokemonFromInput.id,
                imgUrl,
                imgUrl2
              )
        }
      } else {
        if (pokemonData.sprites.front_default) {
          if (imgRef.current) {
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
      }
      if (imgRef.current) {
        imgRef.current.crossOrigin = "anonymous"
      }
      // setIsAbsoluteLoading(false)
    }
  }, [
    pokemonData,
    pokemon,
    pokemonForm,
    hasForm,
    animationMapKey,
    imgRef.current,
    showShinySprite,
    pokemonFromInput.label,
  ])

  // useEffect(() => {
  //   if (
  //     pokemonData &&
  //     pokemonData.sprites.other &&
  //     pokemonData.sprites.other['official-artwork'].front_default
  //   ) {
  //     officialImage.src = pokemonData.sprites.other['official-artwork'].front_default
  //     officialImage.width = 475
  //     officialImage.height = 475
  //     officialImage.crossOrigin = 'anonymous'
  //   }
  // }, [pokemonData, officialImage])

  useEffect(() => {
    setPokemonForm(undefined)
    const trackPokemonSearchOnFirebase = async (pokemon: string) => {
      await waitForAuth() // ensures Firebase auth is ready
      await trackPokemonSearch(pokemon)
    }
    if (pokemon) {
      setPokemonFromInput(
        initPokemonFromURL(pokemon) ?? {
          label: "ampharos",
          id: 181,
        }
      )
      trackPokemonSearchOnFirebase(pokemon)
    }
  }, [pokemon])

  useEffect(() => {
    setIsAbsoluteLoading(true)
    setPokemonForm(searchParams.get("form") ?? undefined)
    if (searchParams.get("isShiny") !== "true") {
      setShowShinySprite(false)
    }
    // if (data && data.sprites.front_shiny) {
    //   setShowShinySprite(searchParams.get('isShiny') === 'true')
    // } else {
    //   setShowShinySprite(false)
    // }
  }, [searchParams])

  // sometimes the hardcoded url doesn't work for shinies, so defaulting to the one the api gives us in that case
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

      // Set canvas size to match image
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0, img.width, img.height)

      const imageData = ctx.getImageData(0, 0, img.width, img.height).data
      let colorCount: Record<string, number> = {}

      // Helper function to round colors for grouping similar shades
      const roundColor = (value: number, precision: number) =>
        Math.round(value / precision) * precision

      const isSurroundedByTransparent = (x: number, y: number): boolean => {
        const index = (y * img.width + x) * 4

        // Skip fully transparent pixels
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
            if (alpha === 0) return true // If any neighbor is transparent
          }
        }

        return false
      }

      // Iterate over each pixel
      for (let y = 0; y < img.height; y++) {
        for (let x = 0; x < img.width; x++) {
          const index = (y * img.width + x) * 4
          const r = roundColor(imageData[index], 1)
          const g = roundColor(imageData[index + 1], 1)
          const b = roundColor(imageData[index + 2], 1)
          const a = imageData[index + 3]

          if (a === 0) continue // skip transparent
          const brightness = (r + g + b) / 3
          if (brightness < 26.5) continue // skip near black

          if (isSurroundedByTransparent(x, y) && brightness < 35) continue // skip outline-adjacent pixels that are darker

          const color = `${r},${g},${b}`
          colorCount[color] = (colorCount[color] || 0) + 1
        }
      }

      if (Object.keys(colorCount).length > 30) {
        colorCount = {}
        for (let y = 0; y < img.height; y++) {
          for (let x = 0; x < img.width; x++) {
            const index = (y * img.width + x) * 4
            const r = roundColor(imageData[index], 60)
            const g = roundColor(imageData[index + 1], 60)
            const b = roundColor(imageData[index + 2], 60)
            const a = imageData[index + 3]

            if (a === 0) continue // skip transparent
            const brightness = (r + g + b) / 3
            if (brightness < 26.5) continue // skip near black

            if (isSurroundedByTransparent(x, y) && brightness < 35) continue // skip outline-adjacent pixels that are darker

            const color = `${r},${g},${b}`
            colorCount[color] = (colorCount[color] || 0) + 1
          }
        }
      }
      let totalPixels = 0

      // Convert to array, sort by frequency, and get top N colors
      const sortedColors = Object.entries(colorCount)
        .sort((a, b) => b[1] - a[1])
        .map(([color, count]) => {
          totalPixels += count
          const rgbColors = color.split(",")
          return {
            color: rgbColors,
            count,
          }
        })
      // some images are not pixel art and have lots of pixels with many different colors, causing slow load times
      const uniquelySortedColors =
        sortedColors.length > 25
          ? sortedColors
          : getMostUniqueColors(sortedColors, pokemonFromInput.id)
      const colorsByLuminance = [...uniquelySortedColors].slice(0, 3)
      orderByLuminance(colorsByLuminance)
      const rgbColors: TColorData[] = uniquelySortedColors.map((rgb) => {
        return {
          color: rgbToHex(
            parseInt(rgb.color[0]),
            parseInt(rgb.color[1]),
            parseInt(rgb.color[2])
          ),
          percentage: (rgb.count / totalPixels) * 100,
        }
      })
      setColorData([
        ...colorsByLuminance.map((rgb) => {
          return {
            color: rgbToHex(
              parseInt(rgb.color[0]),
              parseInt(rgb.color[1]),
              parseInt(rgb.color[2])
            ),
            percentage: (rgb.count / totalPixels) * 100,
          }
        }),
        ...rgbColors.slice(3),
      ])
      // setColorData(rgbColors)
      window.setTimeout(() => setIsAbsoluteLoading(false), 500)
    }
  }

  // officialImage.onload = async () => {
  //   try {
  //     const croppedImage = await cropWhitespace(officialImage)
  //     setOfficialImageUrl(croppedImage)
  //   } catch (error) {
  //     console.error("Error cropping image:", error)
  //   }
  // }

  const [pokemonTeam, setPokemonTeam] = useState<
    { iconName: string; pokemonName: string; formName: string | undefined }[]
  >(() => {
    if (typeof window !== "undefined") {
      return JSON.parse(localStorage.getItem("pokemonTeam") || "[]")
    }
    return []
  })

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("pokemonTeam", JSON.stringify(pokemonTeam))
    }
  }, [pokemonTeam])

  const { width } = useWindowDimensions()
  const leftPaddingForContent =
    typeof window !== "undefined"
      ? width >= 1460
        ? width > 1512
          ? `${166 + (width - 1512) / 2}px`
          : "166px"
        : undefined
      : "0px"

  const baseFontColor = getContrastingBaseTextColor(
    colorData.at(0)?.color ?? "#ffffff"
  )

  let totalStat = 0

  const data = dataFromApi || pokemonData

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget)
  }
  const handleClose = () => {
    setAnchorEl(null)
  }

  // this is for the autocomplete open state
  const [optionsOpen, setOptionsOpen] = useState(false)

  const [animData, setAnimData] = useState<AnimationData | undefined>(undefined)
  const [noAnimDataExists, setNoAnimDataExists] = useState<boolean>(false)
  const [hasRetried, setHasRetried] = useState<boolean>(false)

  const animatedImageSrc = `https://cdn.jsdelivr.net/gh/pagefaultgames/pokerogue@02cac77/public/images/pokemon/exp/${
    showShinySprite ? "shiny/" : ""
  }${animationMapKey}.png`
  const animatedImageJson = `https://cdn.jsdelivr.net/gh/pagefaultgames/pokerogue@02cac77/public/images/pokemon/exp/${
    showShinySprite ? "shiny/" : ""
  }${animationMapKey}.json`
  const animatedImageRetrySrc = `https://cdn.jsdelivr.net/gh/pagefaultgames/pokerogue@02cac77/public/images/pokemon/${
    showShinySprite ? "shiny/" : ""
  }${animationMapKey}.png`
  const animatedImageRetryJson = `https://cdn.jsdelivr.net/gh/pagefaultgames/pokerogue@02cac77/public/images/pokemon/${
    showShinySprite ? "shiny/" : ""
  }${animationMapKey}.json`

  useEffect(() => {
    setNoAnimDataExists(false)
    async function loadAnimation(retry: boolean) {
      try {
        setHasRetried(retry)
        const res = await fetch(
          retry ? animatedImageRetryJson : animatedImageJson
        )
        const data: AnimationData = await res.json()
        setAnimData(data)
      } catch {
        if (!retry) {
          loadAnimation(true)
        }
        setAnimData(undefined)
        setNoAnimDataExists(true)
      }
    }
    loadAnimation(false)
    // if (pokemonForm) {
    //   loadAnimation(false)
    // } else {
    //   setNoAnimDataExists(true)
    // }
  }, [
    pokemonFromInput.id,
    pokemonForm,
    animatedImageJson,
    animatedImageRetryJson,
  ])

  const isAnythingLoading =
    isAbsoluteLoading ||
    isLoading ||
    speciesIsLoading ||
    evolutionIsLoading ||
    (!animData && !noAnimDataExists)

  const audioMapKey =
    audioMap[(pokemonForm ?? pokemonFromInput.label) as TPokemonAudioKey]
  const soundUrl = `https://github.com/pagefaultgames/pokerogue/raw/main/public/audio/cry/${audioMapKey}.m4a`

  usePlaySoundOnUrlChange(soundUrl, !isAnythingLoading && playPokemonCries)

  const navigateToSwatches = () => {
    if (speciesData?.color) {
      api.pokemon
        .getPokemonColorByName(speciesData.color.name)
        .then((data) => {
          const randomEntries = []
          const usedIndexes = new Set()

          while (randomEntries.length < 5) {
            const randomIndex = Math.floor(
              Math.random() * data.pokemon_species.length
            )
            if (!usedIndexes.has(randomIndex)) {
              usedIndexes.add(randomIndex)
              randomEntries.push(data.pokemon_species[randomIndex])
            }
          }

          const swatchUrl = `/swatch/${
            pokemonForm ?? pokemon ?? pokemonFromInput.label
          }-${randomEntries.map((r) => r.name).join("-")}`

          navigate(swatchUrl)
        })
        .catch((error) => console.error(error))
    }
  }

  const style: React.CSSProperties = {
    backgroundColor: `${colorData.at(0)?.color ?? "#D0CFCF"}CC`,
    color: baseFontColor,
    ["--color1" as any]: colorData.at(0)?.color ?? "#D0CFCF",
    ["--color2" as any]: colorData.at(1)?.color ?? "#7A7D7D",
    ["--color2-light" as any]: `${colorData.at(1)?.color ?? "#7A7D7D"}CC`,
    ["--color3" as any]: colorData.at(2)?.color ?? "#565254",
    ["--color4" as any]: colorData.at(3)?.color ?? "#FFFBFE",
    ["--color4-light" as any]: `${colorData.at(3)?.color ?? "#FFFBFE"}CC`,
  }

  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return undefined
  }

  return (
    <div className={styles.app} style={style}>
      <header className={styles.appHeader}>
        <div className={styles.pokeballandLogoContainer}>
          <div
            className={classNames(styles.pokeball, styles.pbHyper)}
            onClick={chooseRandomPokemon}
          >
            <div className={styles.top}></div>
            <div className={styles.button} />
          </div>
          <h1 className={styles.logo}>PokeSwatch</h1>
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
                    borderRadius: "0px 0px 30px 30px", // bottom rounded corners for dropdown
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
              // slots={{
              //   listbox: ListboxComponent,
              // }}
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
                      "& .MuiAutocomplete-root .MuiOutlinedInput-root": {},
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
                                pokemonForm?.replaceAll("-", "") ??
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
                      // renderSuffix: () => (
                      //   <div className={styles.pokemonDexNumber}>#{data?.id}</div>
                      // ),
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
                  {/* <div
                  style={{
                    width: '40px',
                    height: '40px',
                    border: '2px solid grey',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '10px',
                    transform: 'scale(1.1)',
                  }}
                >
                  <div
                    style={{
                      background: getPokemonIcon(option.label),
                      width: '40px',
                      height: '30px',
                      imageRendering: 'pixelated',
                    }}
                  />
                </div> */}
                  <div
                    style={{
                      display: "flex",
                      // flexDirection: 'column',
                      alignItems: "center",
                      gap: "4px",
                      overflow: "hidden",
                      // marginLeft: '6px',
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
                setPokemonForm(undefined)
                if (newValue) {
                  navigate(`/pokemon/${newValue.label}`)
                  // setPokemonFromInput(newValue)
                }
              }}
            />
          </div>
          {!!pokemonTeam.length && (
            <div className={styles.pokemonTeamContainer}>
              {pokemonTeam.map((p) => (
                <div
                  style={{
                    background: "white",
                    borderRadius: "6px",
                    width: "56px",
                    height: "56px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    position: "relative",
                  }}
                  key={p.iconName}
                  onClick={() => {
                    const formURL = p.formName ? `?form=${p.formName}` : ""
                    navigate(`/pokemon/${p.pokemonName}${formURL}`)
                  }}
                >
                  <div
                    className={styles.bouncingIcon}
                    style={{
                      background: getPokemonIcon(p.iconName),
                      width: "40px",
                      height: "30px",
                      imageRendering: "pixelated",
                      scale: "1.4",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      right: "-7px",
                      top: "-7px",
                      background: "lightgray",
                      color: "black",
                      fontSize: "16px",
                      borderRadius: "50%",
                      width: "20px",
                      height: "20px",
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      setPokemonTeam((prev) => {
                        const newTeam = [...prev]
                        const idx = newTeam.findIndex(
                          (p2) => p2.iconName === p.iconName
                        )
                        newTeam.splice(idx, 1)
                        return newTeam
                      })
                    }}
                  >
                    ✕
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <Button
            id="basic-button"
            className={styles.settingsIcon}
            aria-controls={open ? "basic-menu" : undefined}
            aria-haspopup="true"
            aria-expanded={open ? "true" : undefined}
            onClick={handleClick}
            size="small"
            disableRipple
          >
            <SettingsIcon
              fontSize="inherit"
              htmlColor={getContrastingTextColor(
                colorData.at(3)?.color ?? "white"
              )}
            />
          </Button>
          <Menu
            id="basic-menu"
            anchorEl={anchorEl}
            open={open}
            onClose={handleClose}
            transformOrigin={{
              vertical: -10,
              horizontal: 85,
            }}
            MenuListProps={{
              "aria-labelledby": "basic-button",
            }}
            sx={{
              padding: "50px",
            }}
          >
            <ListSubheader>Color Format</ListSubheader>
            <MenuItem onClick={() => setColorFormat("hex")}>Hex</MenuItem>
            <MenuItem onClick={() => setColorFormat("rgb")}>RGB</MenuItem>
            <MenuItem onClick={() => setColorFormat("hsl")}>HSL</MenuItem>
            <MenuItem onClick={() => setColorFormat("hsv")}>HSV</MenuItem>
            <ListSubheader>Show Animations</ListSubheader>
            <MenuItem onClick={() => setShowAnimations((prev) => !prev)}>
              {showAnimations ? "Hide" : "Show"}
            </MenuItem>
            <ListSubheader>Play Pokemon Audio</ListSubheader>
            <MenuItem onClick={() => setPlayPokemonCries((prev) => !prev)}>
              {playPokemonCries ? "No" : "Yes"}
            </MenuItem>
          </Menu>
        </div>
      </header>
      <div
        className={styles.contentContainer}
        // FIX THIS
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
              {/* this is the shiny feature, commenting out for now because some shiny
              sprites suck and dealing with shiny is kind of annoying */}
              <Button
                id="toggleShinyButton"
                onClick={() => {
                  if (data) {
                    if (!imgRef.current) return undefined
                    setIsAbsoluteLoading(true)
                    if (showShinySprite) {
                      // if (pokemonForm) {
                      //   imgRef.current.src =
                      //     "https://cdn.jsdelivr.net/gh/PokeAPI/sprites@613b7d0/sprites/pokemon/" +
                      //     pokemonData?.id +
                      //     pokemonForm?.replace(pokemonData?.name ?? "", "") +
                      //     ".png"
                      // } else {
                      //   imgRef.current.src = data.sprites.front_default!
                      // }
                      router.push(
                        `${pathname}?${createQueryString(
                          [
                            pokemonForm
                              ? { name: "form", value: pokemonForm }
                              : null,
                            { name: "isShiny", value: "false" },
                          ].filter(
                            (param): param is { name: string; value: string } =>
                              param !== null
                          )
                        )}`
                      )
                    } else {
                      // if (pokemonForm) {
                      //   const imgUrl =
                      //     "https://cdn.jsdelivr.net/gh/PokeAPI/sprites@613b7d0/sprites/pokemon/shiny/" +
                      //     pokemonData?.id +
                      //     pokemonForm?.replace(pokemonData?.name ?? "", "") +
                      //     ".png"
                      //   imgRef.current.src = imgUrl
                      // } else {
                      //   imgRef.current.src = getShinyPokemonSprites(
                      //     pokemonFromInput.id,
                      //     animationMapKey,
                      //     data.sprites.front_shiny!
                      //   )
                      // }
                      router.push(
                        `${pathname}?${createQueryString(
                          [
                            pokemonForm
                              ? { name: "form", value: pokemonForm }
                              : undefined,
                            { name: "isShiny", value: "true" },
                          ].filter(
                            (param): param is { name: string; value: string } =>
                              param !== undefined
                          )
                        )}`
                      )
                    }
                  }
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
                {data && data.sprites.front_shiny ? (
                  showShinySprite ? (
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
                  )
                ) : undefined}
              </Button>
              <Button
                id="addToTeamButton"
                onClick={() => {
                  setPokemonTeam((prev) => {
                    const iconName =
                      pokemonForm?.replaceAll("-", "") ?? pokemonFromInput.label
                    if (prev.length === 6) {
                      return prev
                    } else if (prev.find((p) => p.iconName === iconName)) {
                      return prev
                    }
                    return [
                      ...prev,
                      {
                        iconName,
                        pokemonName: pokemonFromInput.label,
                        formName: pokemonForm,
                      },
                    ]
                  })
                }}
                sx={{
                  color: "inherit",
                  position: "relative",
                  "&:hover": {
                    backgroundColor: "rgba(255, 255, 255, 0.3)",
                  },
                  borderRadius: "50%",
                  minWidth: "53px",
                  height: "53px",
                  padding: "9px",
                  marginLeft: "16px",
                }}
                size="small"
                disableRipple
              >
                <CatchingPokemonTwoToneIcon sx={{ fontSize: "35px" }} />
                <AddCircleIcon
                  sx={{
                    position: "absolute",
                    bottom: "7px",
                    right: "8px",
                    fontSize: "16px",
                    backgroundColor: `${colorData.at(0)?.color}CC`,
                    borderRadius: "50%",
                  }}
                />
              </Button>
              {(speciesData &&
                pokemonData &&
                (speciesData.varieties.length > 1 ||
                  pokemonData.forms.length > 1) &&
                shouldHaveFormSelector(pokemon || "") && (
                  <FormControl sx={{ ml: "25px", minWidth: 120 }}>
                    <Select
                      value={pokemonForm ?? pokemonData?.name}
                      // onChange={newValue => setPokemonForm(newValue.target.value)}
                      sx={{
                        color: "inherit",
                        "& .MuiOutlinedInput-notchedOutline": {
                          borderColor: "inherit",
                        },
                        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                          borderColor: "inherit", // focused border
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
                                  router.push(`${pathname}`)
                                } else {
                                  router.push(
                                    `${pathname}?${createQueryString([
                                      { name: "form", value: v.pokemon.name },
                                    ])}`
                                  )
                                }
                                // setPokemonForm(v.is_default ? undefined : v.pokemon.name)
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
                        ((speciesData?.varieties ?? []).length
                          ? pokemonData?.forms.slice(1)
                          : pokemonData?.forms) ?? []
                      ).map((f, idx) => (
                        <MenuItem
                          key={f.name}
                          onClick={() => {
                            if (
                              idx === 0 &&
                              !(speciesData?.varieties ?? []).length
                            ) {
                              // setIsFormAndNotVariety(false)
                              router.push(`${pathname}`)
                            } else {
                              // setIsFormAndNotVariety(true)
                              router.push(
                                `${pathname}?${createQueryString([
                                  {
                                    name: "form",
                                    value: f.name,
                                  },
                                  {
                                    name: "isForm",
                                    value: "true",
                                  },
                                ])}`
                              )
                            }
                            // setPokemonForm(f.name)
                          }}
                          style={{ textTransform: "capitalize" }}
                          value={f.name}
                        >
                          {idx === 0 && !(speciesData?.varieties ?? []).length
                            ? "Default"
                            : f.name
                                .split(
                                  `${pokemonFromInput.label.toLowerCase()}-`
                                )
                                .slice(1)}{" "}
                          Form
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )) ||
                ""}
            </div>
            <div className={styles.contentContainerMidSection}>
              <div>
                <div className={styles.pokemonSprites}>
                  {/* <div>
                    {(officialImageUrl && (
                      <img
                        src={officialImageUrl}
                        crossOrigin="anonymous"
                        alt="pokemon"
                        style={{height: '250px'}}
                      />
                    )) ||
                      ''}
                  </div> */}
                  <div className={styles.pokemonSpriteContainer}>
                    {!showAnimations || !animData ? (
                      (spriteImageUrl && (
                        <img
                          src={spriteImageUrl}
                          crossOrigin="anonymous"
                          alt="pokemon"
                          className={styles.pokemonSprite}
                        />
                      )) ||
                      ""
                    ) : (
                      <PokemonSpriteAnimator
                        spriteUrl={
                          hasRetried ? animatedImageRetrySrc : animatedImageSrc
                        }
                        animationData={animData}
                        fallbackAnimation={
                          pokemonData?.sprites.versions["generation-v"][
                            "black-white"
                          ].animated.front_default ?? spriteImageUrl
                        }
                        interval={100} // 100ms between frames
                      />
                    )}
                  </div>
                </div>
              </div>
              <div className={styles.pokemonInfoContainer}>
                <div
                  style={{
                    display: "flex",
                    gap: "3px",
                    marginBottom: "10px",
                    alignItems: "center",
                    justifyContent: "start",
                  }}
                >
                  {data?.types.map((pokemonType) => (
                    <div
                      className={classNames(
                        styles.pokemonType,
                        styles[pokemonType.type.name]
                      )}
                      key={pokemonType.type.name}
                    >
                      {pokemonType.type.name}
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    marginBottom: "10px",
                    alignItems: "start",
                    justifyContent: "start",
                  }}
                >
                  <>
                    {data &&
                      data?.abilities.map((ability) => {
                        const pokemonAbility = pokemonAbilities.find(
                          (pa) => pa.name === ability.ability.name
                        )
                        const pokemonEffectEntry =
                          pokemonAbility?.effect_entries.find(
                            (ee) => ee.language.name === "en"
                          )
                        const pokemonFlavorTextEntry =
                          pokemonAbility?.flavor_text_entries.find(
                            (ee) => ee.language.name === "en"
                          )
                        return (
                          (pokemonEffectEntry || pokemonFlavorTextEntry) && (
                            <DSTooltip
                              key={ability.ability.name}
                              tooltipColor={colorData.at(4)?.color ?? "#000"}
                              title={
                                pokemonEffectEntry?.short_effect ??
                                pokemonFlavorTextEntry?.flavor_text
                              }
                              placement={width < 925 ? "top" : "right"}
                              arrow
                            >
                              <div style={{ lineHeight: "20px" }}>
                                {ability.is_hidden
                                  ? "Hidden Ability"
                                  : "Ability"}
                                : {ability.ability.name}
                              </div>
                            </DSTooltip>
                          )
                        )
                      })}
                  </>
                </div>
                {data?.stats &&
                  data.stats.map((stat, idx) => {
                    totalStat += stat.base_stat
                    return (
                      <div key={idx} style={{ display: "flex" }}>
                        <div style={{ textAlign: "left", width: "90px" }}>{`${
                          statToDisplay[stat.stat.name]
                        }: ${stat.base_stat}`}</div>
                        <div className={styles.statBar}>
                          <div
                            style={{
                              width: `${(stat.base_stat / 255) * 100}%`,
                              backgroundColor: colorData.at(3)?.color,
                              height: "100%",
                              border: "1px solid",
                              maxWidth: "350px",
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                <div style={{ display: "flex", width: "100%" }}>
                  <div style={{ textAlign: "left", width: "180px" }}>
                    Total: {totalStat}
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.buttonsContainer}>
              {colorData.length && (
                <div
                  style={{
                    background: colorData[1].color,
                    border: "none",
                    fontFamily: "Inconsolata",
                    cursor: "pointer",
                    fontSize: "20px",
                    marginTop: "12px",
                    padding: "6px 20px",
                    alignItems: "center",
                    display: "flex",
                  }}
                >
                  <a
                    style={{
                      textDecoration: "none",
                      color: getContrastingTextColor(colorData[1].color),
                    }}
                    target="_blank"
                    href={`https://coolors.co/${colorData
                      .slice(0, 10)
                      .reduce((link, color, idx) => {
                        link += `${color.color.replace("#", "")}`
                        if (idx !== colorData.length - 1 && idx !== 9) {
                          link += "-"
                        }
                        return link
                      }, "")}?ref=67d3aa79b0e34e000b84f4ff`}
                    rel="noreferrer"
                  >
                    View colors on Coolors
                  </a>
                </div>
              )}
              {spriteImageUrl && colorData.length && !!data && (
                <ImageGenerator
                  spriteUrl={spriteImageUrl}
                  colors={colorData}
                  pokemonName={data.name}
                  buttonColor={colorData[2].color}
                />
              )}
            </div>
            <div
              style={{
                display: "flex",
                gap: "0px",
                justifyContent: "center",
                marginTop: "10px",
                maxWidth: "800px",
                flexWrap: "wrap",
              }}
            >
              <ColorStrip
                data={colorData}
                width={"100%"}
                tooltipTextFormatter={(color) =>
                  formattedColor(color, colorFormat)
                }
              />
              {colorData.slice(0, 10).map((cd) => (
                <CopyToClipboard
                  key={cd.color}
                  text={
                    colorFormat === "hex"
                      ? formattedColor(cd.color, colorFormat)
                      : formattedColor(cd.color, colorFormat).replace(
                          /[^0-9,#]/g,
                          ""
                        )
                  }
                >
                  <div
                    style={{
                      background: cd.color,
                      color: getContrastingTextColor(cd.color),
                      cursor: "pointer",
                    }}
                    className={styles.colorBlock}
                  >
                    <div
                      style={{
                        color: getContrastingBaseTextColor(cd.color),
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        padding: "10px",
                        borderRadius: "4px",
                        backgroundColor: cd.color,
                      }}
                      className={
                        getContrastingBrightness(cd.color) === "120%"
                          ? styles.swatchColorCopyLight
                          : styles.swatchColorCopyDark
                      }
                    >
                      {colorFormat === "hex"
                        ? formattedColor(cd.color, colorFormat)
                        : formattedColor(cd.color, colorFormat).replace(
                            /[^0-9,#]/g,
                            ""
                          )}
                      <ContentCopyIcon
                        style={{ fontSize: "18px", marginLeft: "8px" }}
                        className={styles.copyIcon}
                      />
                    </div>
                  </div>
                </CopyToClipboard>
              ))}
            </div>
          </>
        )}
      </div>
      <div className={styles.rightDrawer}>
        <div className={styles.rightDrawerTabs}>
          <div
            className={styles.rightDrawerTabHalf}
            style={{
              color: colorData.length
                ? getContrastingTextColor(colorData[2].color)
                : "white",
            }}
            onClick={navigateToSwatches}
          >
            Create Swatch
          </div>
          <a
            className={styles.rightDrawerTabHalf}
            style={{
              color: colorData.length
                ? getContrastingTextColor(colorData[0].color)
                : "black",
              backgroundColor: colorData[0]?.color ?? "white",
              textDecoration: "none",
            }}
            href="https://buymeacoffee.com/pjung16"
            target="_blank"
            rel="noreferrer"
          >
            Buy Me Pizza 🍕
          </a>
        </div>
        <div className={styles.rightDrawerTabs}>
          <div
            className={styles.rightDrawerTab}
            style={{
              color: colorData.length
                ? getContrastingTextColor(colorData[2].color)
                : "white",
            }}
            onClick={() => setTab("types")}
          >
            Type Matchups
          </div>
          <div
            className={styles.rightDrawerTab}
            style={{
              color: colorData.length
                ? getContrastingTextColor(colorData[2].color)
                : "white",
            }}
            onClick={() => setTab("moves")}
          >
            Moves
          </div>
          <div
            className={styles.rightDrawerTab}
            style={{
              color: colorData.length
                ? getContrastingTextColor(colorData[2].color)
                : "white",
            }}
            onClick={() => setTab("evolution")}
          >
            Evolutions
          </div>
        </div>
        <div>
          {isAnythingLoading ? (
            <div
              className={classNames(
                styles.pokeball,
                styles.pbHyper,
                styles.loader
              )}
            >
              <div className={styles.top} />
              <div className={styles.button} />
            </div>
          ) : (
            <RightDrawerContent
              pokemonData={pokemonData}
              evolutionData={pokemonEvolutionData}
              tab={tab}
              colors={colorData}
              setIsAbsoluteLoading={setIsAbsoluteLoading}
            />
          )}
        </div>
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

export default PokemonClientPage
