import {
  ChainLink,
  EvolutionChain,
  MainClient,
  Move,
  Pokemon,
  PokemonMove,
} from "pokenode-ts"
import { useCallback, useEffect, useState, useRef } from "react"
import { useMutation } from "@tanstack/react-query"
import { pokemonNameToQueryableName } from "./utils"
import { useRouter } from "next/navigation"

type TUseMovesAndEvolutionsResult = {
  moves: Move[]
  evolutions: PokemonEvolution | undefined
}

type PokemonEvolution = {
  pokemon: Pokemon
  evolutions: PokemonEvolution[]
}

export function useMovesAndEvolutions(
  pokemonData?: Pokemon,
  evolutionData?: EvolutionChain
): TUseMovesAndEvolutionsResult {
  const api = new MainClient()
  const [evolutions, setEvolutions] = useState<PokemonEvolution | undefined>(
    undefined
  )
  const [moves, setMoves] = useState<Move[]>([])

  const getSpecificPokemon = async (name: string | undefined) => {
    if (name) {
      return api.pokemon
        .getPokemonByName(pokemonNameToQueryableName(name))
        .then((data) => data)
        .catch((error) => console.error(error))
    }
    return undefined
  }

  const { mutateAsync } = useMutation({
    mutationFn: getSpecificPokemon,
  })
  const getEvolutions = useCallback(
    async (chain: ChainLink): Promise<PokemonEvolution> => {
      const pokemonMutationData = await mutateAsync(chain.species.name)
      if (chain.evolves_to.length) {
        chain.evolves_to.forEach((mon) => {
          getEvolutions(mon)
        })
      }
      const evolutionPromises = chain.evolves_to.map(async (mon) => {
        const subsequentEvolutions = await getEvolutions(mon)
        return subsequentEvolutions
      })
      const promise = await Promise.all(evolutionPromises)
      return {
        pokemon: pokemonMutationData!,
        evolutions: promise,
      }
    },
    [mutateAsync]
  )

  useEffect(() => {
    if (evolutionData) {
      setEvolutions(undefined)
      getEvolutions(evolutionData.chain).then((data) => {
        setEvolutions(data)
      })
    }
  }, [evolutionData, getEvolutions])

  const getMove = async (move: string | undefined) => {
    if (move) {
      return api.move
        .getMoveByName(move)
        .then((data) => data)
        .catch((error) => console.error(error))
    }
    return undefined
  }

  const { mutateAsync: moveMutate } = useMutation({
    mutationFn: getMove,
    onSuccess: (data) => {
      setMoves((prev) => {
        if (data && !prev.find((m) => m.name === data.name)) {
          prev.push(data)
        }
        return prev
      })
    },
  })

  const getMoves = useCallback(
    (moves: PokemonMove[]) => {
      moves.forEach((move) => {
        moveMutate(move.move.name)
      })
    },
    [moveMutate]
  )

  useEffect(() => {
    if (pokemonData) {
      getMoves(pokemonData.moves)
    }
  }, [pokemonData, getMoves])

  return {
    moves,
    evolutions,
  }
}

function getWindowDimensions() {
  if (typeof window !== "undefined") {
    const { innerWidth: width, innerHeight: height } = window
    return {
      width,
      height,
    }
  }
  return {
    width: 0,
    height: 0,
  }
}

export function useWindowDimensions() {
  const [windowDimensions, setWindowDimensions] = useState(
    getWindowDimensions()
  )

  useEffect(() => {
    function handleResize() {
      setWindowDimensions(getWindowDimensions())
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return windowDimensions
}

export const useScrollbarWidth = () => {
  const [scrollbarWidth, setScrollbarWidth] = useState(0)

  useEffect(() => {
    const calculateScrollbarWidth = () => {
      const width = window.innerWidth - document.documentElement.clientWidth
      setScrollbarWidth(width)
    }

    calculateScrollbarWidth()
    window.addEventListener("resize", calculateScrollbarWidth)

    return () => window.removeEventListener("resize", calculateScrollbarWidth)
  }, [])

  return scrollbarWidth
}

export const usePokemonNavigate = (
  setIsAbsoluteLoading: React.Dispatch<React.SetStateAction<boolean>>
) => {
  const router = useRouter()
  const navigate = (url: string) => {
    const currentUrl = window.location.pathname + window.location.search
    if (currentUrl !== url) {
      // any time navigate happens, call setIsAbsoluteLoading(true) to allow for a
      // smoother transition
      setIsAbsoluteLoading(true)
      router.push(url)
    }
  }

  return { navigate }
}

export function usePlaySoundOnUrlChange(soundUrl: string, playSound: boolean) {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (!soundUrl) return

    const audio = new Audio(soundUrl)
    audioRef.current = audio

    if (playSound) {
      audio.play().catch((err: unknown) => {
        console.error("Audio playback failed:", err)
      })
    }

    return () => {
      audio.pause()
      audioRef.current = null
    }
  }, [soundUrl, playSound])
}
