import axios from "axios"
import sharp from "sharp";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync, writeFileSync } from "fs";
import { MaxRectsPacker } from "maxrects-packer";

// Canvas dimensions
const canvasWidth = 10000;
const canvasHeight = 2000;
const gap = 3;


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
  allColors: string[] // all colors in the sprite
  width: number    // trimmed sprite width
  height: number   // trimmed sprite height
  filename: string
}

// Order: 1 white, 2 light grey, 3 pink, 4 red, 5 orange, 6 brown, 7 yellow, 8 green, 9 blue, 10 purple, 11 dark grey, 12 black
// Returns sort key in [0, 1] (0 = white, 1 = black)
function colorAxis(hex: string): number {
  const { h, s, l } = hexToHsl(hex);

  // 1. White
  if (l > 0.95 && s < 0.3) return 0;
  // 12. Black
  if (l < 0.05) return 11 / 12;

  // Greys (low saturation)
  if (s < 0.2) {
    if (l > 0.5) return 1 / 12;   // 2. Light grey
    return 10 / 12;                 // 11. Dark grey
  }

  // Chromatic: classify by hue and lightness
  // 6. Brown: dark orange/red-brown (low L only) – check before orange
  if (l < 0.35 && h >= 10 && h <= 48) return 5 / 12;
  // 3. Pink: red/magenta hue + high lightness
  if (l > 0.7 && (h >= 330 || h < 30)) return 2 / 12;
  // 4. Red: H 0–20 or 340–360
  if (h < 20 || h >= 340) return 3 / 12;
  // 5. Orange: H 20–42, medium+ lightness (narrow band so distinct from yellow)
  if (h >= 20 && h < 42 && l >= 0.35) return 4 / 12;
  // 7. Yellow: H 42–70 (includes gold; distinct from orange)
  if (h >= 42 && h < 70) return 6 / 12;
  // 8. Green: H 70–180
  if (h >= 70 && h < 180) return 7 / 12;
  // 9. Blue: H 180–260
  if (h >= 180 && h < 260) return 8 / 12;
  // 10. Purple: H 260–330
  if (h >= 260 && h < 330) return 9 / 12;
  // Fallback (e.g. pink/magenta band)
  return 2 / 12;
}

// Returns a tag string for packer (00–11) so same-color sprites pack together. Order matches colorAxis.
function getColorTag(hex: string): string {
  const axis = colorAxis(hex);
  const bucket = Math.min(11, Math.floor(axis * 12));
  return String(bucket).padStart(2, "0");
}

const pokemonFromApi = await axios.get("https://pokeswatch-backend-production.up.railway.app/pokemon-colors?shiny=false&limit=1600")

const pokemonFromApiToColorData = async(pokemon: IPokemonColorsResponseData[]): Promise<PokemonColorData[]> => {
  const results = await Promise.all(pokemon.map(async (p) => {
    const spritePath = join(publicDir, "sprites", "normal", p.filename);
    if (!existsSync(spritePath)) return null;
    const metadata = await sharp(spritePath).metadata();
    const dominantColor = p.colors[0].color;
    return {
      id: p.id,
      name: p.pokemonName,
      colorHex: dominantColor,
      allColors: p.colors.map(c => c.color),
      width: metadata.width!,
      height: metadata.height!,
      filename: p.filename
    }
  }))
  return results.filter((r): r is PokemonColorData => r !== null)
}

// Convert API → color data and sort by color axis
const pokemonWithColor = await pokemonFromApiToColorData(
  pokemonFromApi.data.data
);

// Sort Pokémon by color axis (white-left → dark-right)
const sortedPokemon = pokemonWithColor.sort(
  (a, b) => colorAxis(a.colorHex) - colorAxis(b.colorHex)
);

// Pick a center seed (middle of color range is safest)
// const seedIndex = Math.floor(sortedPokemon.length / 2);
// const [seedPokemon] = sortedPokemon.splice(seedIndex, 1);

// Create the packer with tag-based grouping so same-color sprites pack together
const packer = new MaxRectsPacker(canvasWidth, canvasHeight, gap, {
  smart: true,
  tag: true,
  exclusiveTag: false, // same bin (one atlas); rects with same tag are packed in the same region
});

// // 👉 Add seed FIRST
// packer.add(seedPokemon.width, seedPokemon.height, {
//   data: seedPokemon
// });

// // Add remaining Pokémon
// sortedPokemon.forEach(p => {
//   packer.add(p.width, p.height, { data: p });
// });

// const seedCount = 4;
// const seeds = [];

// for (let i = 1; i <= seedCount; i++) {
//   const idx = Math.floor((sortedPokemon.length * i) / (seedCount + 1));
//   seeds.push(sortedPokemon.splice(idx, 1)[0]);
// }

// // Add seeds first
// seeds.forEach(p =>
//   packer.add(p.width, p.height, { data: p })
// );

// Build rects with color tags so packer groups by color (white→black order)
const rectsToPack = sortedPokemon.map((p) => ({
  width: p.width,
  height: p.height,
  data: { ...p, tag: getColorTag(p.colorHex) },
}));
// Packer expects IRectangle[]; our plain objects have width, height, data and work at runtime
packer.addArray(rectsToPack as Parameters<typeof packer.addArray>[0]);

// Extract packed positions
const results: any[] = [];

packer.bins.forEach(bin => {
  bin.rects.forEach(r => {
    results.push({
      data: r.data, // original Pokémon info
      x: r.x,
      y: r.y,
      width: r.width,
      height: r.height
    });
  });
});

console.log("Packed Pokémon count:", results.length);

console.log(results)

// const sorted = (await pokemonFromApiToColorData(pokemonFromApi.data.data)).sort((a, b) => colorAxis(a.colorHex) - colorAxis(b.colorHex));

// const positioned = layoutPokemonPackedByColor(sorted)

writeFileSync("positioned.json", JSON.stringify(results, null, 2))

// console.log(positioned)