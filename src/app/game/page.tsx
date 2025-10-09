import React from "react"
import GamePageClient from "./GamePageClient"

export const metadata = {
  title: "Pokémon Color Guessing Game",
  description: "Guess the Pokémon from its color palette!",
}

export default function GamePage() {
  return <GamePageClient />
}
