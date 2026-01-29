"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import pokemonIdMap from "../../pokemon-id-map-object.json"
import { cropWhitespace } from "../../image"
import {
  getContrastingBaseTextColor,
  getContrastingBrightness,
} from "../../color"
import { TColorData, TColorFormat, TPokemonAnimationKey } from "../../types"
import {
  formattedColor,
  pokemonFormsToExclude,
  pokemonNameToQueryableName,
} from "../../utils"
import { MainClient, Pokemon, PokemonSpecies } from "pokenode-ts"
import { useQuery } from "@tanstack/react-query"
import { PokemonCombobox } from "../../components/PokemonCombobox/PokemonCombobox"
import PokemonSpriteAnimator, {
  AnimationData,
} from "../../components/PokemonSpriteAnimator"
import animationMap from "../../animationMap.json"
import ContentCopyIcon from "@mui/icons-material/ContentCopy"
import CopyToClipboard from "@/app/components/CopyToClipboard"
import styles from "../styles.module.css"
import classNames from "classnames"
import Link from "next/link"
import ColorDropdown from "@/app/components/ColorDropdown"
import axios from "axios"
import { IPokemonColorsResponseData } from "@/types/PokemonColorResponseData"
import api from "@/app/api/api"

type PokemonIdMap = Record<string, number>
export const typedPokemonIdMap: PokemonIdMap = pokemonIdMap

interface PokemonSwatchProps {
  pokemon: string
  updatePokemonRoute: (
    currentUrl: string,
    oldPokemonName: string,
    newPokemonName: string
  ) => void
  colorFormat: TColorFormat
  showAnimations: boolean
}

const PokemonSwatch: React.FC<PokemonSwatchProps> = ({
  pokemon,
  updatePokemonRoute,
  colorFormat,
  showAnimations,
}) => {
  const [selectedPokemon, setSelectedPokemon] = useState<string>(pokemon)
  const [pokemonFromInput, setPokemonFromInput] = useState<{
    label: string
    id: number | string
  }>({
    label: selectedPokemon,
    id: typedPokemonIdMap[selectedPokemon],
  })
  const pokemonId =
    typedPokemonIdMap[pokemonNameToQueryableName(selectedPokemon)]
  const imgRef = useRef<HTMLImageElement | null>(null)
  useEffect(() => {
    const img = new Image()
    imgRef.current = img
  }, [])
  const [spriteImageUrl, setSpriteImageUrl] = useState("")
  const [colors, setColors] = useState<TColorData[]>([])
  const [displayedColors, setDisplayedColors] = useState<TColorData[]>([])
  const [isLoadingImage, setIsLoadingImage] = useState(true)
  const [speciesData, setSpeciesData] = useState<PokemonSpecies | undefined>(
    undefined
  )

  const exceptionPokemon = [
    "cherrim",
    "arceus",
    "genesect",
    "gastrodon",
    "shellos",
    "unown",
    "burmy",
    "florges",
    "flabebe",
    "floette",
    "silvally",
  ]

  const foundException = exceptionPokemon.find((ex) =>
    selectedPokemon.includes(ex)
  )

  // Queries
  const { data: pokemonData, isLoading } = useQuery({
    queryKey: ["getPokemon", selectedPokemon],
    queryFn: () => getPokemon(),
    refetchOnWindowFocus: false,
  })

  const animationMapKey =
    animationMap[
      (selectedPokemon ?? pokemonFromInput.label) as TPokemonAnimationKey
    ]

  const [pokemonColorData, setPokemonColorData] = useState<IPokemonColorsResponseData | undefined>(undefined)

  const fetchPokemonColors = useCallback(async () => {
    setIsLoadingImage(true)
    api.get<IPokemonColorsResponseData>(`/pokemon-colors/${pokemonNameToQueryableName(selectedPokemon)}?shiny=false`)
      .then((response) => {
        setPokemonColorData(response.data)
        if (imgRef.current) {
          const folder = response.data.isShiny ? 'shiny' : 'normal'
          const spritePath = `/sprites/${folder}/${response.data.filename}`
          imgRef.current.src = spritePath
          imgRef.current.crossOrigin = "anonymous"
          imgRef.current.alt = selectedPokemon
        }
        // Set colors from API response
        setDisplayedColors(response.data.colors.slice(0, 3))
        setColors(response.data.colors)
        window.setTimeout(() => setIsLoadingImage(false), 500)
      })
      .catch((error) => {
        console.error(error)
        setPokemonColorData(undefined)
        setIsLoadingImage(false)
      })
  }, [selectedPokemon])

  useEffect(() => {
    if (pokemonData && selectedPokemon) {
      fetchPokemonColors()
    }
  }, [pokemonData, selectedPokemon, fetchPokemonColors])

  // Handle image load for cropping (sprite image still needs cropping for display)
  useEffect(() => {
    if (!imgRef.current) return

    imgRef.current.onload = async () => {
      if (!imgRef.current) return
      try {
        const croppedImage = await cropWhitespace(imgRef.current)
        setSpriteImageUrl(croppedImage)
      } catch (error) {
        console.error(selectedPokemon, imgRef.current.src)
        console.error("Error cropping image:", error)
      }
    }
  }, [selectedPokemon])

  const PokeApi = new MainClient()

  const getPokemon = (
    overrideName?: string,
    retryCount: number = 0
  ): Promise<Pokemon | undefined> => {
    return PokeApi.pokemon
      .getPokemonByName(
        pokemonNameToQueryableName(overrideName ?? selectedPokemon)
      )
      .then((data) => {
        PokeApi.pokemon
          .getPokemonSpeciesByName(data.species.name)
          .then((data) => {
            setSpeciesData(data)
          })
          .catch((error) => console.error(error))
        return data
      })
      .catch((_) => {
        if (retryCount < 5) {
          return getPokemon(foundException ?? selectedPokemon, retryCount + 1)
        }
      })
  }

  useEffect(() => {
    // can be undefined, we only want it to run this when it's false
    if (
      pokemonData?.is_default === false ||
      pokemonFromInput.id === undefined
    ) {
      setPokemonFromInput({
        label: pokemonData?.name ?? selectedPokemon,
        id: `${speciesData?.id ?? typedPokemonIdMap[selectedPokemon]}`,
      })
    }
  }, [
    speciesData?.name,
    speciesData?.id,
    selectedPokemon,
    pokemonData?.is_default,
    pokemonData?.name,
  ])

  const formOptions = useMemo(() => {
    // need to check if the species names match because sometimes there were formOptions from 2 different pokemon
    const forms =
      pokemonData?.species.name === speciesData?.name
        ? pokemonData?.forms.slice(1).map((form) => ({
            id: `${pokemonData.id}`,
            label: form.name,
          })) || []
        : []

    const varieties =
      pokemonData?.species.name === speciesData?.name
        ? speciesData?.varieties?.map((variety) => ({
            id: `${speciesData.id}`,
            label: variety.pokemon.name,
          })) || []
        : []

    const combinedOptions = [
      ...forms.filter((v) => !pokemonFormsToExclude.includes(v.label)),
      ...varieties.filter(
        (v) =>
          !v.label.includes("totem") &&
          (!v.label.includes("pikachu") || !v.label.includes("cap")) &&
          v.label !== "zygarde-10" &&
          !pokemonFormsToExclude.includes(v.label)
      ),
    ]

    // Remove duplicates based on the `label` property
    const uniqueOptions = Array.from(
      new Map(combinedOptions.map((option) => [option.label, option])).values()
    )

    return uniqueOptions
  }, [pokemonData, speciesData])

  const [animData, setAnimData] = useState<AnimationData | undefined>(undefined)
  const [noAnimDataExists, setNoAnimDataExists] = useState<boolean>(false)
  const [hasRetried, setHasRetried] = useState<boolean>(false)

  const animatedImageSrc = `https://cdn.jsdelivr.net/gh/pagefaultgames/pokerogue@02cac77/public/images/pokemon/exp/${animationMapKey}.png`
  const animatedImageJson = `https://cdn.jsdelivr.net/gh/pagefaultgames/pokerogue@02cac77/public/images/pokemon/exp/${animationMapKey}.json`
  const animatedImageRetrySrc = `https://cdn.jsdelivr.net/gh/pagefaultgames/pokerogue@02cac77/public/images/pokemon/${animationMapKey}.png`
  const animatedImageRetryJson = `https://cdn.jsdelivr.net/gh/pagefaultgames/pokerogue@02cac77/public/images/pokemon/${animationMapKey}.json`

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
  }, [
    pokemonFromInput.id,
    selectedPokemon,
    animatedImageJson,
    animatedImageRetryJson,
  ])

  const pokemonUrl = (() => {
    if (speciesData && pokemonData) {
      const formUrl = pokemonData.is_default ? "" : `?form=${pokemonData.name}`
      const isInnateForm = pokemonData.forms.find(
        (form, idx) => form.name === selectedPokemon && idx > 0
      )
      const innateFormUrl = isInnateForm ? `?form=${selectedPokemon}` : ""
      return `/pokemon/${speciesData?.name}${formUrl}${innateFormUrl}`
    }
  })()

  return (
    <div
      style={{
        width: "100%",
        textAlign: "center",
        minHeight: "428px",
      }}
    >
      <div
        style={{
          position: "relative",
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          height: "100%",
        }}
      >
        {/* <h2
          style={{
            position: 'absolute',
            transform: 'translate(-50%, -50%)',
            top: '20%',
            left: '50%',
            backgroundColor: 'black',
            color: 'white',
            padding: '6px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            textTransform: 'capitalize',
            borderRadius: '4px',
          }}
        >
          {pokemon}
        </h2> */}
        <PokemonCombobox
          pokemonFromInput={pokemonFromInput}
          setPokemonFromInput={setPokemonFromInput}
          selectedPokemon={selectedPokemon}
          setSelectedPokemon={setSelectedPokemon}
          isPokemonForm={
            !!pokemonData?.forms.find(
              (form, idx) => form.name === selectedPokemon && idx > 0
            )
          }
          pokemonIconString={
            pokemonData?.is_default
              ? pokemonFromInput.label
              : pokemonData?.name.replaceAll("-", "") ?? pokemonFromInput.label
          }
          formOptions={formOptions}
          updatePokemonRoute={updatePokemonRoute}
        />
        {isLoading ||
        // speciesIsLoading ||
        isLoadingImage ||
        (!isLoadingImage && spriteImageUrl.length === 0) ||
        (!animData && !noAnimDataExists) ? (
          <div
            className={classNames(
              styles.pokeball,
              styles.pbHyper,
              styles.swatchLoader
            )}
            style={{ position: "absolute", top: "45%" }}
          >
            <div className={styles.top}></div>
            <div className={styles.button} />
          </div>
        ) : !showAnimations || !animData ? (
          <Link
            href={pokemonUrl ?? "/"}
            style={{
              position: "absolute",
              transform: "translate(-50%, -50%)",
              top: "54%",
              left: "50%",
            }}
          >
            <img
              style={{
                imageRendering: "pixelated",
                height: "150px",
              }}
              src={spriteImageUrl}
              alt={selectedPokemon}
              // onClick={navigateToPokemon}
            />
          </Link>
        ) : (
          <Link
            href={pokemonUrl ?? "/"}
            style={{
              position: "absolute",
              transform: "translate(-50%, -50%)",
              top: "54%",
              left: "50%",
            }}
          >
            <PokemonSpriteAnimator
              style={{
                imageRendering: "pixelated",
                height: "150px",
              }}
              spriteUrl={hasRetried ? animatedImageRetrySrc : animatedImageSrc}
              animationData={animData}
              fallbackAnimation={
                pokemonData?.sprites.versions["generation-v"]["black-white"]
                  .animated.front_default ?? spriteImageUrl
              }
              interval={100} // 100ms between frames
            />
          </Link>
        )}
        {displayedColors.map((color, index) => {
          const hexColor = color.color
          return (
            <div
              key={index}
              style={{
                backgroundColor: hexColor
              }}
              className={styles.swatchColorContainer}
            >
              <div className={styles.swatchInfoContainer}>
                <ColorDropdown
                  colors={colors.map((c) => c.color)}
                  selectedColor={displayedColors[index].color}
                  onColorChange={(color) => {
                    setDisplayedColors((prevColors) => {
                      const newColors = [...prevColors]
                      const newColorData = colors.find((c) => c.color === color)
                      if (newColorData) {
                        newColors[index] = newColorData
                      }
                      return newColors
                    })
                  }}
                />
                <CopyToClipboard
                  key={hexColor + pokemon}
                  text={
                    colorFormat === "hex"
                      ? formattedColor(hexColor, colorFormat)
                      : formattedColor(hexColor, colorFormat).replace(
                          /[^0-9,#]/g,
                          ""
                        )
                  }
                >
                  <h3
                    style={{
                      color: getContrastingBaseTextColor(hexColor),
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      padding: "10px",
                      borderRadius: "4px",
                      backgroundColor: hexColor,
                    }}
                    className={
                      getContrastingBrightness(hexColor) === "120%"
                        ? styles.swatchColorCopyLight
                        : styles.swatchColorCopyDark
                    }
                  >
                    {colorFormat === "hex"
                      ? formattedColor(hexColor, colorFormat)
                      : formattedColor(hexColor, colorFormat).replace(
                          /[^0-9,#]/g,
                          ""
                        )}
                    <ContentCopyIcon
                      style={{ fontSize: "18px", marginLeft: "8px" }}
                    />
                  </h3>
                </CopyToClipboard>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default PokemonSwatch
