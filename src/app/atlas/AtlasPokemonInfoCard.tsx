"use client"

import { useEffect, useMemo, useState } from "react"
import { queryableNameToPokemonName, statToDisplay } from "../utils"
import styles from "./styles.module.css"
import Link from "next/link"
import speciesData from "../species.json"
import { getContrastingTextColor } from "../color"
import classNames from "classnames"

interface IPokemonSprite {
  data: {
    id: string;
    name: string;
    colorHex: string;
    allColors: string[];
    width: number;
    height: number;
    filename: string;
  };
  x: number;
  y: number;
  width: number;
  height: number;
}

interface IPokeApiPokemon {
  height: number;
  weight: number;
  types: { slot: number; type: { name: string } }[];
  stats: { base_stat: number; stat: { name: string } }[];
}

interface AtlasPokemonInfoCardProps {
  selectedPokemon: IPokemonSprite | null;
  onClose: () => void;
}

function formatPokemonDisplayName(name: string): string {
  return name
    .replaceAll("-", " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

function formatStatLabel(statName: string): string {
  return statName
    .replaceAll("-", " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

export default function AtlasPokemonInfoCard({
  selectedPokemon,
  onClose,
}: AtlasPokemonInfoCardProps) {
  const [pokemonData, setPokemonData] = useState<IPokeApiPokemon | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const pokemonApiName = useMemo(
    () => selectedPokemon?.data.name?.toLowerCase() ?? "",
    [selectedPokemon]
  )
  const basePokemonApiName = useMemo(
    () => pokemonApiName.split("-")[0],
    [pokemonApiName]
  )

  useEffect(() => {
    if (!selectedPokemon || !pokemonApiName) {
      setPokemonData(null)
      setFetchError(null)
      return
    }

    const controller = new AbortController()

    async function fetchPokemonWithFallback(): Promise<IPokeApiPokemon> {
      const attemptNames: string[] = [pokemonApiName]
      if (basePokemonApiName && basePokemonApiName !== pokemonApiName) {
        attemptNames.push(basePokemonApiName)
      }

      for (const name of attemptNames) {
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${name}`, {
          signal: controller.signal,
        })
        if (response.ok) {
          return (await response.json()) as IPokeApiPokemon
        }
        // Retry next fallback only for not-found cases.
        if (response.status !== 404) {
          throw new Error(`PokeAPI request failed (${response.status})`)
        }
      }

      throw new Error("PokeAPI request failed for all fallback names")
    }

    async function fetchPokemonInfo() {
      setIsLoading(true)
      setFetchError(null)
      setPokemonData(null)
      try {
        const data = await fetchPokemonWithFallback()
        setPokemonData(data)
      } catch (error) {
        if (!controller.signal.aborted) {
          setFetchError("Unable to load PokeAPI data for this Pokemon.")
          setPokemonData(null)
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    fetchPokemonInfo()

    return () => controller.abort()
  }, [selectedPokemon, pokemonApiName, basePokemonApiName])

  if (!selectedPokemon) return null
  if (isLoading) {
    return (
      <div className={styles.atlasInfoCard}>
        <div className={styles.atlasInfoCardLoaderWrap}>
          <div className={classNames(styles.pokeball, styles.pbHyper, styles.loader)}>
            <div className={styles.top}></div>
            <div className={styles.button} />
          </div>
        </div>
      </div>
    )
  }
  const totalStat = pokemonData?.stats.reduce((sum, stat) => sum + stat.base_stat, 0) ?? 0
  const pokemonName = queryableNameToPokemonName(selectedPokemon.data.name)
  const pokemonHref = Object.prototype.hasOwnProperty.call(speciesData, pokemonName)
    ? `/pokemon/${pokemonName}`
    : `/pokemon/${pokemonName.split("-")[0]}?form=${pokemonName}`

  return (
    <div className={styles.atlasInfoCard} style={{ backgroundColor: `${selectedPokemon.data.allColors[0] ?? selectedPokemon.data.colorHex}f0` }}>
      <div className={styles.atlasInfoCardHeader}>
        <h3 className={styles.atlasInfoCardTitle} style={{ color: getContrastingTextColor(selectedPokemon.data.allColors[0] ?? selectedPokemon.data.colorHex) }}>
          {formatPokemonDisplayName(selectedPokemon.data.name)}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className={styles.atlasInfoCardClose}
          aria-label="Close selected Pokemon card"
        >
          ×
        </button>
      </div>

      {isLoading && (
        <div className={styles.atlasInfoCardMessage}>
          Loading Pokemon details...
        </div>
      )}
      {fetchError && (
        <div className={styles.atlasInfoCardError}>
          {fetchError}
        </div>
      )}
      {pokemonData && (
        <div className={styles.atlasInfoCardSection}>
          <div className={styles.atlasInfoCardTypes}>
            {pokemonData.types
              .sort((a, b) => a.slot - b.slot)
              .map((typeEntry) => {
                const typeName = typeEntry.type.name
                return (
                  <div
                    key={typeName}
                    className={`${styles.pokemonType} ${styles[typeName] ?? ""}`}
                  >
                    {typeName}
                  </div>
                )
              })}
          </div>
          <div className={styles.atlasInfoCardSpriteWrap}>
            <img
              src={`/spritesForAtlas/normal/${selectedPokemon.data.filename}`}
              alt={selectedPokemon.data.name}
              className={styles.atlasInfoCardSprite}
            />
          </div>
          <div className={styles.atlasInfoCardStats} style={{ color: getContrastingTextColor(selectedPokemon.data.allColors[0] ?? selectedPokemon.data.colorHex) }}>
            {pokemonData.stats.map((statEntry) => (
              <div key={statEntry.stat.name} className={styles.atlasInfoCardStatRow}>
                <div className={styles.atlasInfoCardStatLabel}>
                  {(statToDisplay[statEntry.stat.name] ??
                    formatStatLabel(statEntry.stat.name))
                    + `: ${statEntry.base_stat}`}
                </div>
                <div className={styles.atlasInfoCardStatBar}>
                  <div
                    className={styles.atlasInfoCardStatFill}
                    style={{
                      width: `${(statEntry.base_stat / 255) * 100}%`,
                      backgroundColor:
                        selectedPokemon.data.allColors[2] ??
                        selectedPokemon.data.colorHex,
                    }}
                  />
                </div>
              </div>
            ))}
            <div className={styles.atlasInfoCardTotalRow}>
              <div className={styles.atlasInfoCardTotal}>
                Total: {totalStat}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={styles.atlasInfoCardPaletteTitle} style={{ color: getContrastingTextColor(selectedPokemon.data.allColors[0] ?? selectedPokemon.data.colorHex) }}>
        Palette
      </div>
      <div className={styles.atlasInfoCardPaletteGrid}>
        {selectedPokemon.data.allColors.slice(0, 10).map((color) => (
          <div key={color} title={color}>
            <div
              className={styles.atlasInfoCardPaletteSwatch}
              style={{
                background: color,
                border: `1px solid ${getContrastingTextColor(selectedPokemon.data.allColors[0])}`
              }}
            />
            <div className={styles.atlasInfoCardPaletteLabel} style={{ color: getContrastingTextColor(selectedPokemon.data.allColors[0]) }}>
              {color}
            </div>
          </div>
        ))}
      </div>

      <Link
        href={pokemonHref}
        className={styles.atlasInfoCardButton}
        style={{
          backgroundColor: selectedPokemon.data.allColors[1] ?? selectedPokemon.data.colorHex,
          color:getContrastingTextColor(selectedPokemon.data.allColors[1] ?? selectedPokemon.data.colorHex)
        }}
      >
        View Pokemon Page
      </Link>
    </div>
  )
}
