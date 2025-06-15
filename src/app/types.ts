import species from "./species.json"
import animationMap from "./animationMap.json"
import audioMap from "./audioMap.json"

export type TPokemon = keyof typeof species
export type TPokemonAnimationKey = keyof typeof animationMap
export type TPokemonAudioKey = keyof typeof audioMap

export type TTab = "types" | "moves" | "evolution"

export type TColorFormat = "hex" | "rgb" | "hsl" | "hsv"

export type TColorData = { color: string; percentage: number }
