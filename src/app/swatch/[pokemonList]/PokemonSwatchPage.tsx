"use client"

import React, { useEffect, useMemo } from "react"
import {
  parsePokemonUrlPath,
  pokemonNameToQueryableName,
  pokemonWithHyphens,
} from "../../utils"
import { BattlePokemonIconIndexes } from "../../BattlePokemonIconIndexes"
import PokemonSwatch, { typedPokemonIdMap } from "./PokemonSwatch"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import * as R from "ramda"
import { useParams, useRouter } from "next/navigation"
import styles from "./styles.module.css"
import { useSwatchPageContext } from "../SwatchPageContext"

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
  console.log(colorFormat, showAnimations)

  const updatePokemonRoute = (
    currentUrl: string,
    oldPokemonName: string,
    newPokemonName: string
  ) => {
    const newPokemonList = currentUrl?.replace(oldPokemonName, newPokemonName)
    window.history.pushState({}, "", `${newPokemonList}`)
  }

  useEffect(() => {
    if (parsedPokemon.length < 6) {
      const additionalPokemon = []
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
    // if parsedPokemon length is greater than 6, only use the first 6 pokemon and discard the rest
    if (parsedPokemon.length > 6) {
      const trimmedPokemon = parsedPokemon.slice(0, 6)
      router.push(`/swatch/${trimmedPokemon.join("-")}`)
    }
  }, [parsedPokemon, router.push])

  useEffect(() => {
    const pokemonWithQueryableNames = parsedPokemon.map((p) =>
      pokemonNameToQueryableName(p)
    )
    if (!R.equals(pokemonWithQueryableNames, parsedPokemon)) {
      router.push(`/swatch/${pokemonWithQueryableNames.join("-")}`)
    }
  }, [router.push, parsedPokemon])

  return (
    <div>
      {/* <header className={styles.appHeader}>
        <div
          className={classNames(styles.pokeball, styles.pbSwatchPage)}
          onClick={chooseRandomPokemon}
        >
          <div className={styles.top}></div>
          <div className={styles.button} />
        </div>
        <h1 style={{ fontFamily: "Sen" }}>PokeSwatch</h1>
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {widthForButtons > 1000 && (
            <>
              <div
                style={{
                  borderRadius: "4px",
                  color: "black",
                  cursor: "pointer",
                  padding: "7px 10px",
                  marginRight: "20px",
                  fontSize: "20px",
                  height: "21px",
                  display: "flex",
                  alignItems: "center",
                  fontWeight: "bold",
                  border: "2px solid #ffc510",
                  boxSizing: "content-box",
                }}
                onClick={randomizePokemon}
              >
                Randomize
              </div>
              <a
                style={{
                  color: "black",
                  backgroundColor: "#ffc510",
                  padding: "7px 10px",
                  borderRadius: "4px",
                  marginRight: "20px",
                  fontSize: "20px",
                  fontWeight: "bold",
                  textDecoration: "none",
                  height: "21px",
                  display: "flex",
                  alignItems: "center",
                  boxSizing: "content-box",
                }}
                href="https://buymeacoffee.com/pjung16"
                target="_blank"
                rel="noreferrer"
              >
                Support 🍕
              </a>
            </>
          )}
          <>
            <Button
              id="basic-button"
              className={styles.settingsIconSwatchPage}
              aria-controls={open ? "basic-menu" : undefined}
              aria-haspopup="true"
              aria-expanded={open ? "true" : undefined}
              onClick={handleClick}
              size="small"
              disableRipple
            >
              <SettingsIcon fontSize="inherit" htmlColor="black" />
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
              {widthForButtons < 1000 && (
                <MenuItem onClick={randomizePokemon}>Randomize</MenuItem>
              )}
              {widthForButtons < 1000 && (
                <MenuItem
                  onClick={() =>
                    router.push("https://buymeacoffee.com/pjung16")
                  }
                >
                  Support
                </MenuItem>
              )}
              <ListSubheader>Color Format</ListSubheader>
              <MenuItem onClick={() => setColorFormat("hex")}>Hex</MenuItem>
              <MenuItem onClick={() => setColorFormat("rgb")}>RGB</MenuItem>
              <MenuItem onClick={() => setColorFormat("hsl")}>HSL</MenuItem>
              <MenuItem onClick={() => setColorFormat("hsv")}>HSV</MenuItem>
              <ListSubheader>Show Animations</ListSubheader>
              <MenuItem onClick={() => setShowAnimations((prev) => !prev)}>
                {showAnimations ? "Hide" : "Show"}
              </MenuItem>
            </Menu>
          </>
        </div>
      </header> */}
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
          available at: github.com
        </div>
        <div>© 2025 PokeSwatch. All rights reserved.</div>
      </footer>
    </div>
  )
}
