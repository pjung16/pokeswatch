"use client"

import { TColorData, TColorFormat } from "@/app/types"
import React, { createContext, useContext, useState, ReactNode } from "react"

type PokemonPageContextType = {
  colorData: TColorData[]
  setColorData: React.Dispatch<React.SetStateAction<TColorData[]>>
  colorFormat: TColorFormat
  setColorFormat: React.Dispatch<React.SetStateAction<TColorFormat>>
  showAnimations: boolean
  setShowAnimations: React.Dispatch<React.SetStateAction<boolean>>
  playPokemonCries: boolean
  setPlayPokemonCries: React.Dispatch<React.SetStateAction<boolean>>
}

const PokemonPageContext = createContext<PokemonPageContextType | undefined>(
  undefined
)

export const PokemonPageProvider = ({ children }: { children: ReactNode }) => {
  const [colorData, setColorData] = useState<TColorData[]>([])
  const [colorFormat, setColorFormat] = useState<TColorFormat>("hex")
  const [showAnimations, setShowAnimations] = useState<boolean>(false)
  const [playPokemonCries, setPlayPokemonCries] = useState<boolean>(false)

  return (
    <PokemonPageContext.Provider
      value={{
        colorData,
        setColorData,
        colorFormat,
        setColorFormat,
        showAnimations,
        setShowAnimations,
        playPokemonCries,
        setPlayPokemonCries,
      }}
    >
      {children}
    </PokemonPageContext.Provider>
  )
}

export const usePokemonPageContext = () => {
  const context = useContext(PokemonPageContext)
  if (!context)
    throw new Error(
      "usePokemonPageContext must be used within PokemonPageProvider"
    )
  return context
}
