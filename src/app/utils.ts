import { defensiveTypeChart } from "./typeCharts"
import species from "./species.json"
import { BattlePokemonIconIndexes } from "./BattlePokemonIconIndexes"
import { TPokemon } from "./types"
import { hexToRgb } from "@mui/material"
import { hexToHSL, hexToHSV } from "./color"
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime"
import speciesMap from "./speciesMap.json"

const getPokemonIconNum = (pokemon: string | number) => {
  let num = 0
  if (typeof pokemon === "string") {
    const pokemonId = species[pokemon as TPokemon]
    if (pokemonId) {
      num = pokemonId
    } else {
      num = BattlePokemonIconIndexes[pokemon] ?? 0
    }
  } else {
    num = pokemon
    if (num < 0) num = 0
    if (num > 1025) num = 0
  }

  // if (isFemale) {
  // 	if (['unfezant', 'frillish', 'jellicent', 'meowstic', 'pyroar'].includes(id)) {
  // 		num = BattlePokemonIconIndexes[id + 'f'];
  // 	}
  // }
  return num
}

export const getPokemonIcon = (pokemon: string | number) => {
  const num = getPokemonIconNum(pokemon)
  console.log(num)

  const top = Math.floor(num / 12) * 30
  const left = (num % 12) * 40
  return `transparent url(/pokemonicons-sheet.png) no-repeat scroll -${left}px -${top}px`
  // return isShiny
  //   ? `url(/pokesprite-master/pokemon/shiny/${pokemon}.png)`
  //   : `transparent url(/pokemonicons-sheet.png) no-repeat scroll -${left}px -${top}px`
}

export const rgbToHex = (r: number, g: number, b: number): string =>
  "#" +
  [r, g, b]
    .map((x) => {
      const hex = x.toString(16)
      return hex.length === 1 ? "0" + hex : hex
    })
    .join("")

export const rgbFilter = (rgb: number[]): boolean =>
  rgb[0] + rgb[1] + rgb[2] > 80

export const speciesToOptions = (species: Record<string, number>) => {
  return Object.entries(species).map(([pokemonName, pokemonId]) => {
    return {
      label: pokemonName,
      id: pokemonId,
    }
  })
}

export const statToDisplay: Record<string, string> = {
  hp: "HP",
  attack: "Atk",
  defense: "Def",
  "special-attack": "SpA",
  "special-defense": "SpD",
  speed: "Spe",
}

export const pokemonNameToQueryableName = (pokemonName: string) => {
  switch (pokemonName) {
    case "deoxys":
      return "deoxys-normal"
    case "wormadam":
      return "wormadam-plant"
    case "giratina":
      return "giratina-altered"
    case "shaymin":
      return "shaymin-land"
    case "basculin":
      return "basculin-red-striped"
    case "darmanitan":
      return "darmanitan-standard"
    case "tornadus":
      return "tornadus-incarnate"
    case "thundurus":
      return "thundurus-incarnate"
    case "landorus":
      return "landorus-incarnate"
    case "enamorus":
      return "enamorus-incarnate"
    case "keldeo":
      return "keldeo-ordinary"
    case "meloetta":
      return "meloetta-aria"
    case "meowstic":
      return "meowstic-male"
    case "morpeko":
      return "morpeko-full-belly"
    case "aegislash":
      return "aegislash-shield"
    case "pumpkaboo":
      return "pumpkaboo-average"
    case "gourgeist":
      return "gourgeist-average"
    case "zygarde":
      return "zygarde-50"
    case "oricorio":
      return "oricorio-baile"
    case "lycanroc":
      return "lycanroc-midday"
    case "wishiwashi":
      return "wishiwashi-solo"
    case "minior":
      return "minior-red-meteor"
    case "mimikyu":
      return "mimikyu-disguised"
    case "toxtricity":
      return "toxtricity-amped"
    case "eiscue":
      return "eiscue-ice"
    case "indeedee":
      return "indeedee-male"
    case "urshifu":
      return "urshifu-single-strike"
    case "basculegion":
      return "basculegion-male"
    case "maushold":
      return "maushold-family-of-four"
    case "oinkologne":
      return "oinkologne-male"
    case "squawkabilly":
      return "squawkabilly-green-plumage"
    case "palafin":
      return "palafin-zero"
    case "tatsugiri":
      return "tatsugiri-curly"
    case "dudunsparce":
      return "dudunsparce-two-segment"

    default:
      return pokemonName
  }
}

export const queryableNameToPokemonName = (pokemonName: string) => {
  switch (pokemonName) {
    case "deoxys-normal":
      return "deoxys"
    case "wormadam-plant":
      return "wormadam"
    case "giratina-altered":
      return "giratina"
    case "shaymin-land":
      return "shaymin"
    case "basculin-red-striped":
      return "basculin"
    case "darmanitan-standard":
      return "darmanitan"
    case "tornadus-incarnate":
      return "tornadus"
    case "thundurus-incarnate":
      return "thundurus"
    case "landorus-incarnate":
      return "landorus"
    case "enamorus-incarnate":
      return "enamorus"
    case "keldeo-ordinary":
      return "keldeo"
    case "meloetta-aria":
      return "meloetta"
    case "meowstic-male":
      return "meowstic"
    case "morpeko-full-belly":
      return "morpeko"
    case "aegislash-shield":
      return "aegislash"
    case "pumpkaboo-average":
      return "pumpkaboo"
    case "gourgeist-average":
      return "gourgeist"
    case "zygarde-50":
      return "zygarde"
    case "oricorio-baile":
      return "oricorio"
    case "lycanroc-midday":
      return "lycanroc"
    case "wishiwashi-solo":
      return "wishiwashi"
    case "minior-red-meteor":
      return "minior"
    case "mimikyu-disguised":
      return "mimikyu"
    case "toxtricity-amped":
      return "toxtricity"
    case "eiscue-ice":
      return "eiscue"
    case "indeedee-male":
      return "indeedee"
    case "urshifu-single-strike":
      return "urshifu"
    case "basculegion-male":
      return "basculegion"
    case "maushold-family-of-four":
      return "maushold"
    case "oinkologne-male":
      return "oinkologne"
    case "squawkabilly-green-plumage":
      return "squawkabilly"
    case "palafin-zero":
      return "palafin"
    case "tatsugiri-curly":
      return "tatsugiri"
    case "dudunsparce-two-segment":
      return "dudunsparce"
    default:
      return pokemonName
  }
}

const pokemonTypes = [
  "normal",
  "fire",
  "water",
  "electric",
  "grass",
  "ice",
  "fighting",
  "poison",
  "ground",
  "flying",
  "psychic",
  "bug",
  "rock",
  "ghost",
  "dragon",
  "dark",
  "steel",
  "fairy",
]

export type TPokemonType = (typeof pokemonTypes)[number]

export const getWeaknesses = (type1: TPokemonType, type2?: TPokemonType) => {
  return pokemonTypes.reduce<Record<string, TPokemonType[]>>(
    (typeMap, t) => {
      const weakness =
        defensiveTypeChart[type1][t] *
        (type2 ? defensiveTypeChart[type2][t] : 1)
      typeMap[weakness].push(t)
      return typeMap
    },
    { "0": [], "0.25": [], "0.5": [], "1": [], "2": [], "4": [] }
  )
  // return pokemonTypes.map(t => {
  //   return {
  //     type: t,
  //     weakness:
  //       defensiveTypeChart[type1][t] * (type2 ? defensiveTypeChart[type2][t] : 1),
  //   }
  // })
}

export const getShinyPokemonSprites = (
  pokemonNumber: number,
  pokemonKey: string,
  shinySpriteUrl: string
): string => {
  switch (true) {
    case shinySpriteUrl.includes("10043"):
    case shinySpriteUrl.includes("10044"):
    case pokemonNumber >= 650:
      return `https://cdn.jsdelivr.net/gh/pagefaultgames/pokerogue@02cac77/public/images/pokemon/shiny/${pokemonKey}.png`
    default:
      return shinySpriteUrl
  }
}

export const getPokemonSpriteURL = (
  pokemonString: string,
  pokemonId: number,
  pokeApiURL: string,
  pokeRogueURL: string
): string => {
  if (
    pokemonString.includes("alcremie") ||
    pokemonString.includes("castform") ||
    pokemonString.includes("pikachu") ||
    pokemonString.includes("gmax") ||
    pokemonString.includes("gourgeist") ||
    // pokemonString.includes("deoxys") ||
    // pokemonString.includes("keldeo") ||
    // pokemonString.includes("meloetta") ||
    // pokemonString.includes("genesect") ||
    // pokemonString.includes("arceus") ||
    pokemonId <= 650
  ) {
    return pokeApiURL
  } else {
    switch (pokemonString) {
      case "cherrim-sunshine":
      case "zygarde-10-power-construct":
      case "zygarde-50-power-construct":
        return pokeApiURL
      case "zygarde-10":
        return "https://cdn.jsdelivr.net/gh/PokeAPI/sprites@cb66bc8/sprites/pokemon/10118.png"
      default:
        return pokeRogueURL
    }
  }
}

export const formattedColor = (
  color: string,
  colorFormat: "hex" | "rgb" | "hsl" | "hsv"
) => {
  switch (colorFormat) {
    case "hex":
      return color
    case "rgb":
      return hexToRgb(color)
    case "hsl":
      return hexToHSL(color)
    case "hsv":
      return hexToHSV(color)
    default:
      return color
  }
}

export const shouldHaveFormSelector = (pokemonString: string): boolean => {
  if (
    pokemonString.includes("koraidon") ||
    pokemonString.includes("miraidon")
  ) {
    return false
  } else {
    return true
  }
}

export function parsePokemonUrlPath(
  urlPath: string,
  validKeys: Set<string>
): string[] {
  const tokens = urlPath.split("-")
  const results: string[] = []

  let i = 0
  while (i < tokens.length) {
    let matchedSlug: string | null = null

    // Try 4-token, 3-token, then 2-token, then 1-token combinations
    for (let len = 4; len >= 1; len--) {
      const slice = tokens.slice(i, i + len)
      if (slice.length < len) continue

      const flatKey = slice.join("")
      if (validKeys.has(flatKey)) {
        matchedSlug = slice.join("-") // return the hyphenated version
        i += len
        break
      }
    }

    if (matchedSlug) {
      results.push(matchedSlug)
    } else {
      // fallback: treat token as-is or handle unknowns
      results.push(tokens[i])
      i++
    }
  }

  return results
}

export const pokemonWithHyphens = {
  nidoranf: 29,
  nidoranm: 32,
  mrmime: 122,
  hooh: 250,
  mimejr: 439,
  porygonz: 474,
  typenull: 772,
  jangmoo: 782,
  hakamoo: 783,
  kommoo: 784,
  tapukoko: 785,
  tapulele: 786,
  tapubulu: 787,
  tapufini: 788,
  mrrime: 866,
  greattusk: 984,
  screamtail: 985,
  brutebonnet: 986,
  fluttermane: 987,
  slitherwing: 988,
  sandyshocks: 989,
  irontreads: 990,
  ironbundle: 991,
  ironhands: 992,
  ironjugulis: 993,
  ironmoth: 994,
  ironthorns: 995,
  wochien: 1001,
  chienpao: 1002,
  tinglu: 1003,
  chiyu: 1004,
  roaringmoon: 1005,
  ironvaliant: 1006,
  walkingwake: 1009,
  ironleaves: 1010,
  gougingfire: 1020,
  ragingbolt: 1021,
  ironboulder: 1022,
  ironcrown: 1023,
}

export const pokemonFormsToExclude = [
  "minior-orange-meteor",
  "minior-yellow-meteor",
  "minior-green-meteor",
  "minior-blue-meteor",
  "minior-indigo-meteor",
  "minior-violet-meteor",
  "miraidon-ultimate-mode",
  "miraidon-low-power-mode",
  "miraidon-drive-mode",
  "miraidon-aquatic-mode",
  "miraidon-glide-mode",
  "koraidon-apex-build",
  "koraidon-limited-build",
  "koraidon-sprinting-build",
  "koraidon-swimming-build",
  "koraidon-gliding-build",
  "scatterbug-meadow",
  "scatterbug-icy-snow",
  "scatterbug-polar",
  "scatterbug-tundra",
  "scatterbug-continental",
  "scatterbug-garden",
  "scatterbug-elegant",
  "scatterbug-modern",
  "scatterbug-marine",
  "scatterbug-archipelago",
  "scatterbug-high-plains",
  "scatterbug-sandstorm",
  "scatterbug-river",
  "scatterbug-monsoon",
  "scatterbug-savanna",
  "scatterbug-sun",
  "scatterbug-ocean",
  "scatterbug-jungle",
  "scatterbug-fancy",
  "scatterbug-poke-ball",
  "spewpa-meadow",
  "spewpa-icy-snow",
  "spewpa-polar",
  "spewpa-tundra",
  "spewpa-continental",
  "spewpa-garden",
  "spewpa-elegant",
  "spewpa-modern",
  "spewpa-marine",
  "spewpa-archipelago",
  "spewpa-high-plains",
  "spewpa-sandstorm",
  "spewpa-river",
  "spewpa-monsoon",
  "spewpa-savanna",
  "spewpa-sun",
  "spewpa-ocean",
  "spewpa-jungle",
  "spewpa-fancy",
  "spewpa-poke-ball",
  "rockruff-own-tempo",

  // Megas with no sprites yet
  // remove these when we have the sprites
  "clefable-mega",
  "starmie-mega",
  "meganium-mega",
  "feraligatr-mega",
  "skarmory-mega",
  "froslass-mega",
  "emboar-mega",
  "excadrill-mega",
  "scolipede-mega",
  "scrafty-mega",
  "eelektross-mega",
  "chandelure-mega",
  "chesnaught-mega",
  "delphox-mega",
  "greninja-mega",
  "pyroar-mega",
  "floette-mega",
  "malamar-mega",
  "barbaracle-mega",
  "dragalge-mega",
  "hawlucha-mega",
  "zygardemega",
  "drampa-mega",
  "falinks-mega",
  "raichu-mega-x",
  "raichu-mega-y",
  "chimecho-mega",
  "absol-mega-z",
  "staraptor-mega",
  "garchomp-mega-z",
  "lucario-mega-z",
  "heatran-mega",
  "darkrai-mega",
  "golurk-mega",
  "meowstic-m-mega",
  "meowstic-f-mega",
  "crabominable-mega",
  "golisopod-mega",
  "magearna-mega",
  "magearna-original-mega",
  "zeraora-mega",
  "scovillain-mega",
  "glimmora-mega",
  "tatsugiri-curly-mega",
  "baxcalibur-mega",
  "tatsugiri-droopy-mega",
  "tatsugiri-stretchy-mega",
]

export const navigateToRandomPokemon = (
  speciesMap: Record<string, string>,
  router: AppRouterInstance
) => {
  const randomNumber = Math.floor(Math.random() * 1025) + 1
  const randomPokemon = speciesMap[`${randomNumber}`]
  if (randomPokemon) {
    router.push(`/pokemon/${randomPokemon}`)
  }
}

export const getRandomPokemonURL = () => {
  const randomNumber = Math.floor(Math.random() * 1025) + 1
  const randomPokemon = (speciesMap as Record<string, string>)[
    `${randomNumber}`
  ]
  return `/pokemon/${randomPokemon}`
}
