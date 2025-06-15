"use client"
import { PokemonPageProvider } from "./context/PokemonPageContext"

export default function PokemonLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <PokemonPageProvider>{children}</PokemonPageProvider>
}
