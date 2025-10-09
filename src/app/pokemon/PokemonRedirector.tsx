"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { getRandomPokemonURL } from "../utils"

export default function SwatchRedirector() {
  const router = useRouter()

  useEffect(() => {
    router.replace(getRandomPokemonURL())
  }, [router])

  return null
}
