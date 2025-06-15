"use client"

import { createContext, useContext, useState } from "react"
import { TColorFormat } from "../types"

// context.tsx
export const SwatchPageContext = createContext<
  | {
      colorFormat: TColorFormat
      setColorFormat: React.Dispatch<React.SetStateAction<TColorFormat>>
      showAnimations: boolean
      setShowAnimations: React.Dispatch<React.SetStateAction<boolean>>
    }
  | undefined
>(undefined)

export const SwatchPageProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const [colorFormat, setColorFormat] = useState<TColorFormat>("hex")
  const [showAnimations, setShowAnimations] = useState<boolean>(false)
  return (
    <SwatchPageContext.Provider
      value={{ colorFormat, setColorFormat, showAnimations, setShowAnimations }}
    >
      {children}
    </SwatchPageContext.Provider>
  )
}

export const useSwatchPageContext = () => {
  const context = useContext(SwatchPageContext)
  if (!context)
    throw new Error(
      "useSwatchPageContext must be used within SwatchPageProvider"
    )
  return context
}
