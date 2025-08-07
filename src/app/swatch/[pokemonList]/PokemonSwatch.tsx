"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import pokemonIdMap from "../../pokemon-id-map-object.json"
import { cropWhitespace } from "../../image"
import {
  getContrastingBaseTextColor,
  getContrastingBrightness,
  getMostUniqueColors,
  orderByLuminance,
} from "../../color"
import { TColorData, TColorFormat, TPokemonAnimationKey } from "../../types"
import {
  formattedColor,
  getPokemonSpriteURL,
  getShinyPokemonSprites,
  pokemonFormsToExclude,
  pokemonNameToQueryableName,
  rgbToHex,
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
import styles from "./styles.module.css"
import classNames from "classnames"
import Link from "next/link"

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
  const [spriteImageUrl, setSpriteImageUrl] = React.useState("")
  const [colors, setColors] = React.useState<TColorData[]>([])
  const [isLoadingImage, setIsLoadingImage] = React.useState(true)
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
  ]

  const foundException = exceptionPokemon.find((ex) =>
    selectedPokemon.includes(ex)
  )
  // const imgUrl =
  //   "https://cdn.jsdelivr.net/gh/PokeAPI/sprites@613b7d0/sprites/pokemon/" +
  //   pokemonId +
  //   (foundException ? selectedPokemon.replace(foundException, "") : "") +
  //   ".png"

  // Queries
  const { data: pokemonData, isLoading } = useQuery({
    queryKey: ["getPokemon", selectedPokemon],
    queryFn: () => getPokemon(),
    refetchOnWindowFocus: false,
  })

  // const {
  //   data: speciesDataFromQuery,
  //   isSuccess: speciesDataSucceeded,
  //   isLoading: speciesIsLoading,
  // } = useQuery({
  //   queryKey: ["getPokemonSpecies", selectedPokemon],
  //   queryFn: getPokemonSpecies,
  //   refetchOnWindowFocus: false,
  // })

  // useEffect(() => {
  //   if (speciesDataSucceeded && speciesDataFromQuery) {
  //     setSpeciesData(speciesDataFromQuery)
  //   }
  // }, [speciesDataSucceeded, speciesDataFromQuery])

  const animationMapKey =
    animationMap[
      (selectedPokemon ?? pokemonFromInput.label) as TPokemonAnimationKey
    ]

  const isInnateForm = pokemonData?.forms.find(
    (form, idx) => form.name === selectedPokemon && idx > 0
  )
  const pokeApiUrl =
    "https://cdn.jsdelivr.net/gh/PokeAPI/sprites@613b7d0/sprites/pokemon/" +
    // (showShinySprite ? "shiny/" : "") +
    pokemonData?.id +
    (isInnateForm
      ? selectedPokemon?.replace(pokemonData?.name ?? "", "")
      : selectedPokemon) +
    ".png"
  const pokeRogueUrl = `https://cdn.jsdelivr.net/gh/pagefaultgames/pokerogue@02cac77/public/images/pokemon/${animationMapKey}.png`
  const imgUrl = getPokemonSpriteURL(
    selectedPokemon ?? pokemonData?.name ?? pokemon,
    parseInt(`${pokemonFromInput.id}`),
    pokeApiUrl,
    pokeRogueUrl
  )

  useEffect(() => {
    if (!imgRef.current) return
    imgRef.current.crossOrigin = "anonymous"
    imgRef.current.alt = selectedPokemon
    imgRef.current.src = imgUrl

    imgRef.current.onerror = () => {
      setIsLoadingImage(true)
      if (!imgRef.current) return
      const newUrl =
        "https://cdn.jsdelivr.net/gh/PokeAPI/sprites@613b7d0/sprites/pokemon/" +
        pokemonId +
        ".png"
      imgRef.current.src = newUrl
    }

    imgRef.current.onload = async () => {
      setIsLoadingImage(true)
      if (!imgRef.current) return
      try {
        const croppedImage = await cropWhitespace(imgRef.current)
        setSpriteImageUrl(croppedImage)
      } catch (error) {
        console.error("Error cropping image:", error)
      }

      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")!

      // Set canvas size to match image
      canvas.width = imgRef.current.width
      canvas.height = imgRef.current.height
      ctx.drawImage(
        imgRef.current,
        0,
        0,
        imgRef.current.width,
        imgRef.current.height
      )

      const imageData = ctx.getImageData(
        0,
        0,
        imgRef.current.width,
        imgRef.current.height
      ).data
      let colorCount: Record<string, number> = {}

      // Helper function to round colors for grouping similar shades
      const roundColor = (value: number, precision: number) =>
        Math.round(value / precision) * precision

      const isSurroundedByTransparent = (x: number, y: number): boolean => {
        if (!imgRef.current) return false
        const index = (y * imgRef.current.width + x) * 4

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

          if (
            nx >= 0 &&
            nx < imgRef.current.width &&
            ny >= 0 &&
            ny < imgRef.current.height
          ) {
            const ni = (ny * imgRef.current.width + nx) * 4
            const alpha = imageData[ni + 3]
            if (alpha === 0) return true // If any neighbor is transparent
          }
        }

        return false
      }

      // Iterate over each pixel
      for (let y = 0; y < imgRef.current.height; y++) {
        for (let x = 0; x < imgRef.current.width; x++) {
          const index = (y * imgRef.current.width + x) * 4
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
        for (let y = 0; y < imgRef.current.height; y++) {
          for (let x = 0; x < imgRef.current.width; x++) {
            const index = (y * imgRef.current.width + x) * 4
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
          : getMostUniqueColors(sortedColors, pokemonId)
      const colorsByLuminance = [...uniquelySortedColors].slice(0, 3)
      orderByLuminance(colorsByLuminance)
      const orderedColors = colorsByLuminance.map((rgb) => {
        return {
          color: rgbToHex(
            parseInt(rgb.color[0]),
            parseInt(rgb.color[1]),
            parseInt(rgb.color[2])
          ),
          percentage: (rgb.count / totalPixels) * 100,
        }
      })
      setColors(orderedColors)
      window.setTimeout(() => setIsLoadingImage(false), 500)
    }
  }, [imgUrl, selectedPokemon, imgRef, pokemonId])

  const api = new MainClient()

  const getPokemon = (
    overrideName?: string,
    retryCount: number = 0
  ): Promise<Pokemon | undefined> => {
    return api.pokemon
      .getPokemonByName(
        pokemonNameToQueryableName(overrideName ?? selectedPokemon)
      )
      .then((data) => {
        console.log(data)
        api.pokemon
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

  // const getPokemonSpecies = () => {
  //   return (
  //     api.pokemon
  //       .getPokemonSpeciesByName(selectedPokemon)
  //       .then((data) => data)
  //       // .catch(() =>
  //       //   api.pokemon.getPokemonSpeciesByName(
  //       //     pokemonData?.species.name ?? selectedPokemon
  //       //   )
  //       // )
  //       .catch((error) => console.error(error))
  //   )
  // }

  useEffect(() => {
    // can be undefined, we only want it to run this when it's false
    // setPokemonFromInput({
    //   label: pokemonData?.name ?? selectedPokemon,
    //   id: `${speciesData?.id ?? typedPokemonIdMap[selectedPokemon]}`,
    // })
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
        {/* <Autocomplete
          options={
            formOptions.length > 1
              ? [...formOptions, ...autocompleteOptions]
              : autocompleteOptions
          }
          groupBy={formOptions.length > 1 ? option => typeof option.id : undefined}
          renderGroup={params => {
            const group = params.group
            const isPokemonGroup = group === 'string'
            return (
              <div>
                <strong>{!isPokemonGroup ? 'Pokémon' : 'Forms'}</strong>
                <div>{params.children}</div>
              </div>
            )
          }}
          getOptionLabel={option => option.label}
          sx={{
            width: 300,
            position: 'absolute',
            top: '20%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
          }}
          renderInput={params => <TextField {...params} />}
          onChange={(event, newValue) => {
            if (newValue) {
              setSelectedPokemon(newValue.label)
              setPokemonFromInput({id: newValue.id, label: newValue.label})
              setSpriteImageUrl('')
            }
          }}
          value={pokemonFromInput}
        /> */}
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
        {colors.map((color, index) => {
          const hexColor = color.color
          return (
            <div
              key={index}
              style={{
                backgroundColor: hexColor,
                height: "50vh",
                display: "flex",
                justifyContent: "center",
                alignItems: "flex-end",
                minHeight: "428px",
              }}
            >
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
                    marginBottom: "20px",
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
          )
        })}
      </div>
    </div>
  )
}

export default PokemonSwatch
