import axios from "axios"
import sharp from "sharp";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync, writeFileSync } from "fs";
import { MaxRectsPacker } from "maxrects-packer";

// Canvas dimensions
const canvasWidth = 10000;
const canvasHeight = 4000;
const gap = 2;
const BAND_COUNT = 12;
const bandWidth = canvasWidth / BAND_COUNT;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// assuming /scripts is at the root
const projectRoot = join(__dirname, "..");
const publicDir = join(projectRoot, "public");

function hexToHsl(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min

  let h = 0
  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta) % 6
    else if (max === g) h = (b - r) / delta + 2
    else h = (r - g) / delta + 4
    h *= 60
  }

  if (h < 0) h += 360

  const l = (max + min) / 2
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1))

  return { h, s, l }
}


interface IColorWithPercentage {
  color: string;
  percentage: number;
}

interface IPokemonColorsResponseData {
  id: string;
  pokemonName: string;
  colors: IColorWithPercentage[];
  filename: string;
  imageUrl: string;
  isShiny: boolean;
  createdAt: Date;
  updatedAt: Date;
}

type PokemonColorData = {
  id: string
  name: string
  colorHex: string // dominant color, e.g. "#A8C878"
  width: number    // trimmed sprite width
  height: number   // trimmed sprite height
  filename: string
  minX: number
  maxX: number
  bandIndex: number
}

function colorAxis(hex: string) {
  const { h, s, l } = hexToHsl(hex);

  // White and black extremes
  if (l > 0.95) return 0;       // white → far left
  if (l < 0.05) return 1;       // black → far right

  // Low saturation (browns/greys) go to right side (0.7–0.9)
  if (s < 0.2) {
    return 0.7 + (1 - l) * 0.2;  // darker grey → closer to 0.9
  }

  // High saturation colors (reds → purples) in middle band (0.2–0.7)
  // Normalize hue: red=0, purple=300
  let hueNorm = h;
  if (hueNorm > 300) hueNorm = 300;  // cap purple
  return 0.2 + (hueNorm / 300) * 0.5;
}

const pokemonFromApi = await axios.get("https://pokeswatch-backend-production.up.railway.app/pokemon-colors?shiny=false&limit=1600")

const pokemonFromApiToColorData = async(pokemon: IPokemonColorsResponseData[]): Promise<PokemonColorData[]> => {
  const results = await Promise.all(pokemon.map(async (p) => {
    const spritePath = join(publicDir, "sprites", "normal", p.filename);
    if (!existsSync(spritePath)) return null;
    const metadata = await sharp(spritePath).metadata();
    const dominantColor = p.colors.sort((a, b) => b.percentage - a.percentage)[0].color;
    const axis = colorAxis(dominantColor);
    const bandIndex = Math.min(BAND_COUNT - 1, Math.floor(axis * BAND_COUNT));
    const minX = bandIndex * bandWidth;
    const maxX = (bandIndex + 1) * bandWidth - metadata.width!;
    return {
      id: p.id,
      name: p.pokemonName,
      colorHex: dominantColor,
      width: metadata.width!,
      height: metadata.height!,
      filename: p.filename,
      minX: minX,
      maxX: maxX,
      bandIndex: bandIndex
    }
  }))
  return results.filter((r): r is PokemonColorData => r !== null)
}

// Sort Pokémon by color axis (white-left → dark-right)
const sortedPokemon = (await pokemonFromApiToColorData(pokemonFromApi.data.data)).sort((a, b) => a.bandIndex - b.bandIndex)
// Create the packer
const packer = new MaxRectsPacker(canvasWidth, canvasHeight, gap, { smart: true, logic: 2 });

// Add all Pokémon sprites to the packer
sortedPokemon.forEach(p => {
  packer.add(p.width, p.height, { data: p });
});

// Now extract packed positions
const results = [];
packer.bins.forEach(bin => {
  bin.rects.forEach(r => {
    const data = r.data;
    const x = Math.min(Math.max(r.x, data.data.minX), data.data.maxX);
    results.push({
      ...data,
      x,
      y: r.y,
      width: r.width,
      height: r.height
    });
  });
});

console.log("Packed Pokémon count:", results.length);

// console.log(results)

// const sorted = (await pokemonFromApiToColorData(pokemonFromApi.data.data)).sort((a, b) => colorAxis(a.colorHex) - colorAxis(b.colorHex));

// const positioned = layoutPokemonPackedByColor(sorted)

writeFileSync("positioned.json", JSON.stringify(results, null, 2))

// console.log(positioned)