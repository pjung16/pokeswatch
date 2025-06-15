"use client"

import { EvolutionChain, Pokemon } from "pokenode-ts"
import React, { useRef, useState, useEffect } from "react"
import { TColorData, TTab } from "../../types"
import { getWeaknesses, queryableNameToPokemonName } from "../../utils"
import { DSTooltip } from "../../components/DSTooltip"
import {
  useMovesAndEvolutions,
  usePokemonNavigate,
  useScrollbarWidth,
  useWindowDimensions,
} from "../../hooks"
import { getContrastingTextColor } from "../../color"
import { cropToSquareRatio } from "../../image"
import classNames from "classnames"
import styles from "./styles.module.css"
import { colors } from "@mui/material"

interface IProps {
  pokemonData?: Pokemon
  evolutionData?: EvolutionChain
  tab: TTab
  colors: TColorData[]
  setIsAbsoluteLoading: React.Dispatch<React.SetStateAction<boolean>>
}

type PokemonEvolution = {
  pokemon: Pokemon
  evolutions: PokemonEvolution[]
}

const getArrowAngles = (numArrows: number) => {
  if (numArrows < 2) return [0] // If only one arrow, keep it straight down

  return Array.from({ length: numArrows }, (_, i) => {
    return -((i - (numArrows - 1) / 2) * 45) / ((numArrows - 1) / 2)
  })
}

const getImgSrcsAndNames = (
  node?: PokemonEvolution
): { src: string; pokemonName: string }[] => {
  if (!node) return [] // In case node is null or undefined
  const srcs = []
  if (node.pokemon.sprites.front_default) {
    srcs.push({
      src: node.pokemon.sprites.front_default,
      pokemonName: node.pokemon.name,
    })
  }
  if (Array.isArray(node.evolutions)) {
    for (const evolution of node.evolutions) {
      srcs.push(...getImgSrcsAndNames(evolution)) // Recursively count evolutions
    }
  }

  return srcs
}

const preloadImages = (
  imgSrcsAndNames: { src: string; pokemonName: string }[]
): Promise<
  {
    src: string
    pokemonName: string
  }[]
> => {
  return Promise.all(
    imgSrcsAndNames.map(({ src, pokemonName }) => {
      return new Promise<{
        src: string
        pokemonName: string
      }>((resolve, reject) => {
        const img = new Image()
        img.src = src
        img.crossOrigin = "anonymous"
        img.onload = () => {
          // Append to a specific div by ID
          // const targetDiv = document.getElementById(
          //   `${pokemonName}-evolution-sprite`
          // )
          // if (!targetDiv?.querySelector('img')) {
          //   cropToSquareRatio(img).then(croppedDataURL => {
          //     const resultImg = new Image()
          //     resultImg.alt = `${pokemonName}-sprite`
          //     resultImg.style.imageRendering = 'pixelated'
          //     resultImg.style.width = '96px'
          //     resultImg.style.height = '96px'
          //     resultImg.style.cursor = 'pointer'
          //     resultImg.src = croppedDataURL
          //     // if (targetDiv) {
          //     //   targetDiv.appendChild(resultImg)
          //     // }
          //     resolve(croppedDataURL)
          //   })
          // }
          cropToSquareRatio(img).then((croppedDataURL) => {
            const resultImg = new Image()
            resultImg.src = croppedDataURL
            // if (targetDiv) {
            //   targetDiv.appendChild(resultImg)
            // }
            resolve({ src: croppedDataURL, pokemonName: pokemonName })
          })
        }
        img.onerror = reject // Rejects if image fails to load
      })
    })
  )
}

export const RightDrawerContent: React.FC<IProps> = ({
  evolutionData,
  tab,
  pokemonData,
  colors,
  setIsAbsoluteLoading,
}: IProps) => {
  const { navigate } = usePokemonNavigate(setIsAbsoluteLoading)

  const { moves, evolutions } = useMovesAndEvolutions(
    pokemonData,
    evolutionData
  )

  const imgSrcsAndNames = getImgSrcsAndNames(evolutions)

  const [croppedImgSrcs, setCroppedImgSrcs] = useState<
    { src: string; pokemonName: string }[]
  >([])

  const hasPreloadedImages = useRef(false)

  useEffect(() => {
    if (!hasPreloadedImages.current && !!imgSrcsAndNames.length) {
      preloadImages(imgSrcsAndNames).then((urls) => {
        setCroppedImgSrcs(urls)
      })
      hasPreloadedImages.current = true
    }
  }, [imgSrcsAndNames, imgSrcsAndNames.length])

  const { width } = useWindowDimensions()

  const scrollBarWidth = useScrollbarWidth()

  const widthMinusScrollBar = width - scrollBarWidth

  const maxEvolutionsPerRow = width <= 1460 ? widthMinusScrollBar / 96 : 4

  const renderEvolutions = (
    evolutions: PokemonEvolution,
    renderArrow: boolean,
    arrowAngle: number
  ): React.ReactNode => {
    const numEvolutions = evolutions.evolutions.length ?? 0

    const angles = getArrowAngles(Math.min(numEvolutions, maxEvolutionsPerRow))

    const imgSrc = croppedImgSrcs.find(
      (cis) => cis.pokemonName === evolutions.pokemon.name
    )

    return !croppedImgSrcs.length ? (
      <div
        key={evolutions.pokemon.name}
        className={classNames(styles.pokeball, styles.pbHyper, styles.loader)}
      >
        <div className={styles.top}></div>
        <div className={styles.button} />
      </div>
    ) : (
      <div key={evolutions.pokemon.name}>
        <div style={{ marginTop: renderArrow ? "0" : "20px" }}>
          {renderArrow && (
            <div
              className={classNames(styles.rightDrawerText, styles.downArrow)}
              style={{
                color: getContrastingTextColor(colors[1].color),
                transform: `rotate(${arrowAngle}deg)`,
              }}
            >
              &#8595;
            </div>
          )}
          <div
            onClick={() => {
              navigate(
                `/pokemon/${queryableNameToPokemonName(
                  evolutions.pokemon.name
                )}`
              )
            }}
          >
            <div
              className={styles.rightDrawerText}
              style={{
                fontSize: "18px",
                fontWeight: 600,
                color: getContrastingTextColor(colors[1].color),
              }}
            >
              {queryableNameToPokemonName(evolutions.pokemon.name)}
            </div>
            <div
              style={{
                display: "flex",
                gap: "3px",
                margin: "10px 0",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
              }}
            >
              {evolutions.pokemon.types.map((pokemonType) => (
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
            {imgSrc && (
              <>
                <img
                  src={imgSrc.src}
                  style={{
                    imageRendering: "pixelated",
                    width: "96px",
                    height: "96px",
                    cursor: "pointer",
                  }}
                  alt={`${imgSrc.pokemonName}-sprite`}
                />
              </>
            )}
          </div>
        </div>
        {!!evolutions.evolutions.length && (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              {evolutions.evolutions.map((e, idx) =>
                renderEvolutions(
                  e,
                  width <= 1460 ? idx <= maxEvolutionsPerRow - 1 : idx < 4,
                  angles[idx]
                )
              )}
            </div>
          </>
        )}
      </div>
    )
  }

  const renderTypes = () => {
    if (pokemonData && colors.length) {
      const weaknesses = getWeaknesses(
        pokemonData.types[0].type.name,
        pokemonData.types[1]?.type.name
      )
      return (
        <div>
          <div
            className={styles.rightDrawerText}
            style={{
              marginTop: "20px",
              fontSize: "18px",
              fontWeight: 600,
              color: getContrastingTextColor(colors[1].color),
            }}
          >
            Defensive Type Chart
          </div>
          {Object.keys(weaknesses)
            .sort()
            .map(
              (effectiveness) =>
                !!weaknesses[effectiveness].length && (
                  <div
                    key={effectiveness}
                    style={{
                      margin: "20px",
                      display: "flex",
                      alignItems: "start",
                      gap: "10px",
                    }}
                  >
                    <div
                      className={styles.rightDrawerText}
                      style={{
                        minWidth: "40px",
                        textAlign: "left",
                        color: getContrastingTextColor(colors[1].color),
                      }}
                    >{`${effectiveness}x:`}</div>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        rowGap: "5px",
                        marginTop: "-2px",
                      }}
                    >
                      {weaknesses[effectiveness].map((t) => (
                        <div
                          key={t}
                          className={classNames(styles.pokemonType, styles[t])}
                        >
                          {t}
                        </div>
                      ))}
                    </div>
                  </div>
                )
            )}
        </div>
      )
    }
    return undefined
  }

  const moveCategoryToIcon = (category: string) => {
    switch (category) {
      case "physical":
        return (
          <img
            alt="physicalMoveIcon"
            src="/PhysicalIC_BW.png"
            style={{ imageRendering: "pixelated" }}
          />
        )
      case "special":
        return (
          <img
            alt="specialMoveIcon"
            src="/SpecialIC_BW.png"
            style={{ imageRendering: "pixelated" }}
          />
        )
      case "status":
        return (
          <img
            alt="statusMoveIcon"
            src="/StatusIC_BW.png"
            style={{ imageRendering: "pixelated" }}
          />
        )
      default:
        return undefined
    }
  }

  const renderMoves = () => {
    return (
      <div className={styles.movesContainer}>
        <div
          className={classNames(styles.moveContainer, styles.rightDrawerText)}
          style={{ color: getContrastingTextColor(colors[1].color) }}
        >
          <div style={{ textAlign: "left" }}>Move</div>
          <div>Type</div>
          <div>Pow.</div>
          <div>Acc.</div>
          <div>Cat.</div>
        </div>
        {moves.map((move) => {
          const pokemonMove = pokemonData?.moves.find(
            (m) => m.move.name === move.name
          )
          if (pokemonMove) {
            const canBeLearnedInRecentGames =
              !!pokemonMove.version_group_details.find(
                (vgd) =>
                  vgd.version_group.name === "scarlet-violet" ||
                  vgd.version_group.name === "sword-shield" ||
                  vgd.version_group.name === "ultra-sun-ultra-moon"
              )
            const englishMoveName = move.names.find(
              (m) => m.language.name === "en"
            )?.name
            if (canBeLearnedInRecentGames) {
              const flavorText = move.flavor_text_entries.find(
                (fte) =>
                  fte.language.name === "en" &&
                  fte.version_group.name === "sword-shield"
              )?.flavor_text
              return (
                <DSTooltip
                  key={move.id}
                  title={flavorText}
                  placement={width <= 1460 ? "top-start" : "right"}
                  tooltipColor={colors[4].color}
                  slotProps={{
                    popper: {
                      modifiers: [
                        {
                          name: "offset",
                          options: {
                            offset: width <= 1460 ? [0, -10] : [0, 15],
                          },
                        },
                      ],
                    },
                  }}
                >
                  <div className={styles.moveContainer}>
                    <div
                      style={{
                        textAlign: "left",
                        color: getContrastingTextColor(colors[1].color),
                      }}
                      className={styles.rightDrawerText}
                    >
                      {englishMoveName}
                    </div>
                    <div
                      className={classNames(
                        styles.pokemonType,
                        styles[move.type.name]
                      )}
                    >
                      {move.type.name}
                    </div>
                    <div
                      className={styles.rightDrawerText}
                      style={{
                        color: getContrastingTextColor(colors[1].color),
                      }}
                    >
                      {move.power ?? "—"}
                    </div>
                    <div
                      className={styles.rightDrawerText}
                      style={{
                        color: getContrastingTextColor(colors[1].color),
                      }}
                    >
                      {move.accuracy ?? "—"}
                    </div>
                    {move.damage_class?.name && (
                      <div>{moveCategoryToIcon(move.damage_class?.name)}</div>
                    )}
                  </div>
                </DSTooltip>
              )
            }
          }
          return undefined
        })}
      </div>
    )
  }

  const renderTab = () => {
    switch (tab) {
      case "evolution":
        return evolutions ? (
          renderEvolutions(evolutions, false, 0)
        ) : (
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
        )
      case "moves":
        return pokemonData && moves.length === pokemonData.moves.length ? (
          renderMoves()
        ) : (
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
        )

      case "types":
        return renderTypes()
    }
  }

  return <div>{colors && renderTab()}</div>
}
