"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { MainClient, Pokemon } from "pokenode-ts"
import {
  formattedColor,
  getPokemonIcon,
  pokemonNameToQueryableName,
  rgbToHex,
  speciesToOptions,
} from "../utils"
import { Button } from "@mui/material"
import { GamePokemonCombobox } from "./GamePokemonCombobox"
import PokeballAndLogo from "../components/PokeballAndLogo"
import SettingsMenu from "../components/SettingsMenu"
import {
  getContrastingBaseTextColor,
  getContrastingBrightness,
  getContrastingTextColor,
  getMostUniqueColors,
  orderByLuminance,
} from "../color"
import { cropToSquareRatio } from "../image"
import { DSTooltip } from "../components/DSTooltip"
import ColorStrip from "../components/ColorStrip"
import CopyToClipboard from "../components/CopyToClipboard"
import { TColorData, TColorFormat, TPokemon } from "../types"
import species from "../species.json"
import styles from "./styles.module.css"
import Footer from "../components/Footer"
import api from "../api/api"
import { useAuth } from "../hooks/useAuth"
import type { DailyGameResponse, UserDailyGameResponse } from "../../types/dailyGame"

// Generate a random Pokemon for practice mode
const getRandomPokemon = (): { label: string; id: number } => {
  const speciesEntries = Object.entries(species)
  const randomIndex = Math.floor(Math.random() * speciesEntries.length)
  const [pokemonName, pokemonId] = speciesEntries[randomIndex]

  return {
    label: pokemonName,
    id: pokemonId as number,
  }
}

function GameContent() {
  const [colorData, setColorData] = useState<TColorData[]>([])
  const [colorFormat, setColorFormat] = useState<TColorFormat>("hex")
  const [gameState, setGameState] = useState<"playing" | "won" | "lost">(
    "playing"
  )
  const [attempts, setAttempts] = useState<number>(0)
  const [maxAttempts] = useState<number>(5)
  const [hints, setHints] = useState<string[]>([])
  const [spriteImageUrl, setSpriteImageUrl] = useState<string | undefined>(
    undefined
  )
  const [gameMode, setGameMode] = useState<"daily" | "practice">("daily")
  const [dailyCompleted, setDailyCompleted] = useState<boolean>(false)
  const [currentPokemon, setCurrentPokemon] = useState<{
    label: string
    id: number
  } | null>(null)
  const [isInverted, setIsInverted] = useState<boolean>(false)
  const [dailyGameId, setDailyGameId] = useState<string | null>(null)
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false)

  const { isAuthenticated, login } = useAuth()
  const pokeApi = new MainClient()

  const autocompleteOptions = speciesToOptions(species)

  const imgRef = useRef<HTMLImageElement | null>(null)

  // Fetch today's daily game from backend
  const { data: dailyGameData, isLoading: isDailyGameLoading } = useQuery({
    queryKey: ["dailyGame"],
    queryFn: async () => {
      const response = await api.get<DailyGameResponse>("/daily-game/today")
      return response.data
    },
    refetchOnWindowFocus: false,
    retry: 2,
  })

  // Fetch user's result for today's game (only if authenticated)
  const { data: myDailyResult, isLoading: isMyResultLoading } = useQuery({
    queryKey: ["dailyGameMyResult"],
    queryFn: async () => {
      const response = await api.get<UserDailyGameResponse>(
        "/daily-game/today/me"
      )
      return response.data
    },
    refetchOnWindowFocus: false,
    enabled: isAuthenticated,
    retry: false,
  })

  // Initialize image ref
  useEffect(() => {
    const img = new Image()
    imgRef.current = img
  }, [])

  // Set daily pokemon from backend response
  useEffect(() => {
    if (dailyGameData && gameMode === "daily") {
      setCurrentPokemon({
        label: dailyGameData.pokemonName,
        id: dailyGameData.pokemonId,
      })
      setDailyGameId(dailyGameData.id)
    }
  }, [dailyGameData, gameMode])

  // Set practice pokemon when switching to practice mode
  useEffect(() => {
    if (gameMode === "practice") {
      setCurrentPokemon(getRandomPokemon())
    }
  }, [gameMode])

  // Check daily completion — backend result for authenticated users, localStorage for guests
  useEffect(() => {
    if (isAuthenticated && myDailyResult) {
      // User already played today via backend
      setDailyCompleted(true)
      setAttempts(myDailyResult.guesses)
      setGameState(myDailyResult.won ? "won" : "lost")
      setHasSubmitted(true)
    } else if (!isAuthenticated) {
      // Fallback to localStorage for unauthenticated users
      const today = new Date()
      const todayUTC = `${today.getUTCFullYear()}-${String(
        today.getUTCMonth() + 1
      ).padStart(2, "0")}-${String(today.getUTCDate()).padStart(2, "0")}`
      const completedDate = localStorage.getItem("dailyGameCompleted")
      if (completedDate === todayUTC) {
        setDailyCompleted(true)
      }
    }
  }, [isAuthenticated, myDailyResult])

  // After sign-in, submit any pending game result that was saved before OAuth redirect
  useEffect(() => {
    if (!isAuthenticated || !dailyGameId || hasSubmitted) return
    const pendingRaw = localStorage.getItem("pendingDailyGameResult")
    if (!pendingRaw) return

    try {
      const pending = JSON.parse(pendingRaw) as {
        gameId: string
        won: boolean
        guesses: number
      }
      // Only submit if the pending result matches today's game
      if (pending.gameId === dailyGameId) {
        api
          .post(`/daily-game/${dailyGameId}/submit`, {
            won: pending.won,
            guesses: pending.guesses,
          })
          .then(() => {
            setHasSubmitted(true)
            setDailyCompleted(true)
            setAttempts(pending.guesses)
            setGameState(pending.won ? "won" : "lost")
            localStorage.removeItem("pendingDailyGameResult")
          })
          .catch((error) => {
            console.error("Failed to submit pending game result:", error)
          })
      } else {
        // Stale pending result from a different day, clean it up
        localStorage.removeItem("pendingDailyGameResult")
      }
    } catch {
      localStorage.removeItem("pendingDailyGameResult")
    }
  }, [isAuthenticated, dailyGameId, hasSubmitted])

  const getPokemon = (): Promise<Pokemon> => {
    if (!currentPokemon) throw new Error("No Pokemon selected")
    return pokeApi.pokemon
      .getPokemonByName(pokemonNameToQueryableName(currentPokemon.label))
      .then((data) => data)
      .catch((_) => {
        return getPokemon()
      })
  }

  const { data: pokemonData, isLoading } = useQuery({
    queryKey: ["getPokemon", currentPokemon?.label || ""],
    queryFn: getPokemon,
    refetchOnWindowFocus: false,
    enabled: !!currentPokemon,
  })

  useEffect(() => {
    if (pokemonData && imgRef.current) {
      const img = imgRef.current
      img.crossOrigin = "anonymous"

      if (pokemonData.sprites.front_default) {
        console.log("Loading Pokemon image:", pokemonData.sprites.front_default)
        img.src = pokemonData.sprites.front_default
      }
    }
  }, [pokemonData])

  useEffect(() => {
    if (imgRef.current) {
      imgRef.current.onload = async () => {
        const img = imgRef.current
        if (!img) return

        try {
          const croppedImage = await cropToSquareRatio(imgRef.current)
          console.log("Cropped image created:", croppedImage)
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
        let colorCount: Record<string, number> = {}

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

        // Process pixels for color extraction
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

        if (Object.keys(colorCount).length > 30) {
          colorCount = {}
          for (let y = 0; y < img.height; y++) {
            for (let x = 0; x < img.width; x++) {
              const index = (y * img.width + x) * 4
              const r = roundColor(imageData[index], 60)
              const g = roundColor(imageData[index + 1], 60)
              const b = roundColor(imageData[index + 2], 60)
              const a = imageData[index + 3]

              if (a === 0) continue
              const brightness = (r + g + b) / 3
              if (brightness < 26.5) continue

              if (isSurroundedByTransparent(x, y) && brightness < 35) continue

              const color = `${r},${g},${b}`
              colorCount[color] = (colorCount[color] || 0) + 1
            }
          }
        }

        let totalPixels = 0
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

        const uniquelySortedColors =
          sortedColors.length > 25
            ? sortedColors
            : getMostUniqueColors(sortedColors, currentPokemon?.id || 1)
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
      }
    }
  }, [currentPokemon?.id])

  // Save pending result to localStorage and redirect to sign in
  const handleSignInToSave = useCallback(() => {
    if (dailyGameId && gameMode === "daily") {
      localStorage.setItem(
        "pendingDailyGameResult",
        JSON.stringify({
          gameId: dailyGameId,
          won: gameState === "won",
          guesses: attempts,
        })
      )
    }
    login()
  }, [dailyGameId, gameMode, gameState, attempts, login])

  // Submit game result to backend (for authenticated users in daily mode)
  const submitGameResult = useCallback(
    async (won: boolean, guesses: number) => {
      if (!isAuthenticated || !dailyGameId || gameMode !== "daily" || hasSubmitted) return
      try {
        await api.post(`/daily-game/${dailyGameId}/submit`, { won, guesses })
        setHasSubmitted(true)
      } catch (error) {
        console.error("Failed to submit game result:", error)
      }
    },
    [isAuthenticated, dailyGameId, gameMode, hasSubmitted]
  )

  const handleGuess = useCallback(
    (pokemonName: string) => {
      if (!pokemonName.trim() || gameState !== "playing" || !currentPokemon)
        return

      const normalizedGuess = pokemonName.toLowerCase().trim()
      const normalizedAnswer = currentPokemon.label.toLowerCase()

      const newAttempts = attempts + 1
      setAttempts(newAttempts)

      if (normalizedGuess === normalizedAnswer) {
        setGameState("won")
        // Mark daily game as completed
        if (gameMode === "daily") {
          setDailyCompleted(true)
          // Submit to backend if authenticated, otherwise use localStorage
          if (isAuthenticated) {
            submitGameResult(true, newAttempts)
          } else {
            const today = new Date()
            const todayUTC = `${today.getUTCFullYear()}-${String(
              today.getUTCMonth() + 1
            ).padStart(2, "0")}-${String(today.getUTCDate()).padStart(2, "0")}`
            localStorage.setItem("dailyGameCompleted", todayUTC)
          }
        }
      } else if (newAttempts >= maxAttempts) {
        setGameState("lost")
        // Mark daily game as completed (loss)
        if (gameMode === "daily") {
          setDailyCompleted(true)
          if (isAuthenticated) {
            submitGameResult(false, newAttempts)
          } else {
            const today = new Date()
            const todayUTC = `${today.getUTCFullYear()}-${String(
              today.getUTCMonth() + 1
            ).padStart(2, "0")}-${String(today.getUTCDate()).padStart(2, "0")}`
            localStorage.setItem("dailyGameCompleted", todayUTC)
          }
        }
      } else {
        // Trigger color inversion for wrong guess
        setIsInverted(true)
        setTimeout(() => setIsInverted(false), 500) // Reset after 0.5 seconds

        // Add hint based on attempt number
        const newHints = [...hints]
        if (newAttempts === 2 && pokemonData) {
          newHints.push(
            `Type: ${pokemonData.types.map((t) => t.type.name).join(", ")}`
          )
        } else if (newAttempts === 4 && pokemonData) {
          newHints.push(
            `Generation: ${
              pokemonData.id <= 151
                ? "I"
                : pokemonData.id <= 251
                ? "II"
                : pokemonData.id <= 386
                ? "III"
                : pokemonData.id <= 493
                ? "IV"
                : pokemonData.id <= 649
                ? "V"
                : pokemonData.id <= 721
                ? "VI"
                : pokemonData.id <= 809
                ? "VII"
                : pokemonData.id <= 905
                ? "VIII"
                : "IX"
            }`
          )
        }
        setHints(newHints)
      }
    },
    [
      gameState,
      attempts,
      maxAttempts,
      hints,
      currentPokemon,
      pokemonData,
      gameMode,
      isAuthenticated,
      submitGameResult,
    ]
  )

  const resetGame = useCallback(() => {
    setGameState("playing")
    setAttempts(0)
    setHints([])
    setIsInverted(false)
    setHasSubmitted(false)
    // Generate new Pokemon for practice mode, keep daily Pokemon for daily mode
    if (gameMode === "practice") {
      setCurrentPokemon(getRandomPokemon())
    }
  }, [gameMode])

  const switchToPracticeMode = useCallback(() => {
    setGameMode("practice")
    setCurrentPokemon(getRandomPokemon())
    setGameState("playing")
    setAttempts(0)
    setHints([])
    setIsInverted(false)
    setHasSubmitted(false)
  }, [])

  const switchToDailyMode = useCallback(() => {
    setGameMode("daily")
    // Set pokemon from backend data if available
    if (dailyGameData) {
      setCurrentPokemon({
        label: dailyGameData.pokemonName,
        id: dailyGameData.pokemonId,
      })
      setDailyGameId(dailyGameData.id)
    }
    // If user already completed today, restore that state
    if (isAuthenticated && myDailyResult) {
      setGameState(myDailyResult.won ? "won" : "lost")
      setAttempts(myDailyResult.guesses)
      setDailyCompleted(true)
      setHasSubmitted(true)
    } else {
      setGameState("playing")
      setAttempts(0)
    }
    setHints([])
    setIsInverted(false)
  }, [dailyGameData, isAuthenticated, myDailyResult])

  const baseFontColor = getContrastingBaseTextColor(
    colorData.at(0)?.color ?? "#ffffff"
  )

  const style: React.CSSProperties = {
    backgroundColor: `${colorData.at(0)?.color ?? "#D0CFCF"}CC`,
    color: baseFontColor,
    filter: isInverted ? "invert(1)" : "none",
    transition: "filter 0.3s ease-in-out",
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
    return null
  }

  return (
    <div className={styles.app} style={style}>
      <header className={styles.appHeader}>
        <PokeballAndLogo />
        <SettingsMenu
          className={styles.settingsIcon}
          iconColor={getContrastingTextColor(colorData.at(3)?.color ?? "white")}
          colorFormat={colorFormat}
          setColorFormat={setColorFormat}
        />
      </header>

      <div className={styles.contentContainer}>
        <div className={styles.gameTitle}>
          <h1>Pokémon Color Guessing Game</h1>
          <div className={styles.modeSelector}>
            <Button
              onClick={switchToDailyMode}
              variant={gameMode === "daily" ? "contained" : "outlined"}
              size="small"
              sx={{
                backgroundColor:
                  gameMode === "daily"
                    ? colorData.at(1)?.color ?? "#7A7D7D"
                    : "transparent",
                color:
                  gameMode === "daily"
                    ? getContrastingTextColor(
                        colorData.at(1)?.color ?? "#7A7D7D"
                      )
                    : getContrastingTextColor("transparent"),
                borderColor: colorData.at(1)?.color ?? "#7A7D7D",
                marginRight: "10px",
                "&:hover": {
                  backgroundColor:
                    gameMode === "daily"
                      ? colorData.at(2)?.color ?? "#565254"
                      : `${colorData.at(1)?.color ?? "#7A7D7D"}20`,
                  color:
                    gameMode === "daily"
                      ? getContrastingTextColor(
                          colorData.at(2)?.color ?? "#565254"
                        )
                      : getContrastingTextColor(
                          `${colorData.at(1)?.color ?? "#7A7D7D"}20`
                        ),
                },
              }}
            >
              Daily Challenge
            </Button>
            <Button
              onClick={switchToPracticeMode}
              variant={gameMode === "practice" ? "contained" : "outlined"}
              size="small"
              disabled={!dailyCompleted}
              sx={{
                backgroundColor:
                  gameMode === "practice"
                    ? colorData.at(1)?.color ?? "#7A7D7D"
                    : "transparent",
                color:
                  gameMode === "practice"
                    ? getContrastingTextColor(
                        colorData.at(1)?.color ?? "#7A7D7D"
                      )
                    : getContrastingTextColor("transparent"),
                borderColor: colorData.at(1)?.color ?? "#7A7D7D",
                opacity: dailyCompleted ? 1 : 0.5,
                "&:hover": {
                  backgroundColor:
                    gameMode === "practice"
                      ? colorData.at(2)?.color ?? "#565254"
                      : `${colorData.at(1)?.color ?? "#7A7D7D"}20`,
                  color:
                    gameMode === "practice"
                      ? getContrastingTextColor(
                          colorData.at(2)?.color ?? "#565254"
                        )
                      : getContrastingTextColor(
                          `${colorData.at(1)?.color ?? "#7A7D7D"}20`
                        ),
                },
              }}
            >
              Practice Mode
              {!dailyCompleted && (
                <span style={{ fontSize: "0.7em", marginLeft: "5px" }}>🔒</span>
              )}
            </Button>
          </div>
        </div>

        {isLoading || (gameMode === "daily" && isDailyGameLoading) ? (
          <div className={styles.loading}>
            <div className={styles.pokeball}>
              <div className={styles.top}></div>
              <div className={styles.button} />
            </div>
          </div>
        ) : (
          <>
            <div className={styles.gameInfo}>
              <div className={styles.attempts}>
                Attempts: {attempts}/{maxAttempts}
              </div>
              <div className={styles.gameState}>
                {gameState === "won" && "🎉 Congratulations! You guessed it!"}
                {gameState === "lost" && "😞 Game Over! Try again next time!"}
              </div>
              {(gameState === "won" || gameState === "lost") &&
                !isAuthenticated &&
                gameMode === "daily" && (
                  <div
                    style={{
                      marginTop: "8px",
                      padding: "10px 16px",
                      borderRadius: "8px",
                      backgroundColor: `${colorData.at(1)?.color ?? "#7A7D7D"}30`,
                      border: `1px solid ${colorData.at(1)?.color ?? "#7A7D7D"}60`,
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      flexWrap: "wrap",
                      justifyContent: "center",
                    }}
                  >
                    <span style={{ fontSize: "0.9em", opacity: 0.9 }}>
                      Sign in to save your progress and track your stats!
                    </span>
                    <Button
                      onClick={handleSignInToSave}
                      variant="contained"
                      size="small"
                      sx={{
                        backgroundColor: colorData.at(1)?.color ?? "#7A7D7D",
                        color: getContrastingTextColor(
                          colorData.at(1)?.color ?? "#7A7D7D"
                        ),
                        textTransform: "none",
                        fontWeight: 600,
                        fontSize: "0.85em",
                        padding: "4px 16px",
                        "&:hover": {
                          backgroundColor: colorData.at(2)?.color ?? "#565254",
                          color: getContrastingTextColor(
                            colorData.at(2)?.color ?? "#565254"
                          ),
                        },
                      }}
                    >
                      Sign in with Google
                    </Button>
                  </div>
                )}
            </div>

            {hints.length > 0 && (
              <div className={styles.hints}>
                <h3
                  style={{
                    color: getContrastingTextColor(
                      colorData.at(2)?.color ?? "#7A7D7D"
                    ),
                  }}
                >
                  Hints:
                </h3>
                {hints.map((hint, index) => (
                  <div
                    key={index}
                    className={styles.hint}
                    style={{
                      color: getContrastingTextColor(
                        colorData.at(3)?.color ?? "#FFFBFE"
                      ),
                    }}
                  >
                    {hint}
                  </div>
                ))}
              </div>
            )}

            <div className={styles.colorDisplay}>
              <div className={styles.colorStripContainer}>
                <ColorStrip
                  data={colorData}
                  width={"100%"}
                  tooltipTextFormatter={(color) =>
                    formattedColor(color, colorFormat)
                  }
                />
              </div>
            </div>

            {gameState === "playing" && (
              <div className={styles.guessSection}>
                <GamePokemonCombobox
                  onGuess={handleGuess}
                  disabled={gameState !== "playing"}
                />
              </div>
            )}

            {(gameState === "won" || gameState === "lost") && (
              <div className={styles.revealedPokemon}>
                <h3>The Pokémon was:</h3>
                <div className={styles.pokemonDisplay}>
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
                          currentPokemon?.label || "egg"
                        ),
                        width: "40px",
                        height: "30px",
                        imageRendering: "pixelated",
                        transform: "scale(1.2)",
                        marginTop: !currentPokemon ? "-12px" : "0px",
                      }}
                    />
                    <div
                      className={styles.pokemonDexNumber}
                      style={{ marginRight: "2px" }}
                    >
                      #{currentPokemon?.id}
                    </div>
                    <div className={styles.revealedPokemonName}>
                      {currentPokemon?.label}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className={styles.pokemonRevealSection}>
              <div className={styles.pokemonImageContainer}>
                {(gameState === "won" || gameState === "lost") &&
                  spriteImageUrl && (
                    <a href={`/pokemon/${currentPokemon?.label}`}>
                      <img
                        src={spriteImageUrl}
                        alt="Pokémon sprite"
                        className={styles.pokemonSprite}
                        crossOrigin="anonymous"
                      />
                    </a>
                  )}
                {gameState === "playing" && (
                  <div className={styles.hiddenPokemon}>
                    <div
                      className={styles.questionMark}
                      style={{
                        color: getContrastingTextColor(
                          colorData.at(0)?.color ?? "#7A7D7D"
                        ),
                      }}
                    >
                      ?
                    </div>
                    <div
                      className={styles.hiddenText}
                      style={{
                        color: getContrastingTextColor(
                          colorData.at(0)?.color ?? "#7A7D7D"
                        ),
                      }}
                    >
                      Guess to reveal!
                    </div>
                  </div>
                )}
              </div>
            </div>

            {(gameState === "won" || gameState === "lost") && gameMode === "practice" && (
              <div className={styles.playAgainSection}>
                <Button
                  onClick={resetGame}
                  variant="contained"
                  sx={{
                    backgroundColor: colorData.at(1)?.color ?? "#7A7D7D",
                    color: getContrastingTextColor(
                      colorData.at(1)?.color ?? "#7A7D7D"
                    ),
                    "&:hover": {
                      backgroundColor: colorData.at(2)?.color ?? "#565254",
                    },
                  }}
                >
                  New Practice Round
                </Button>
              </div>
            )}
          </>
        )}
      </div>
      <Footer shouldCenter />
    </div>
  )
}

export default GameContent
