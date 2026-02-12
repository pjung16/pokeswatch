/**
 * Pokemon Color Palette Extractor
 * 
 * A standalone script to extract color palettes from all Pokemon images.
 * Uses the appropriate image source (PokeAPI or PokeRogue) based on Pokemon ID.
 * 
 * Usage:
 *   node extractColorPalette.js                    # Process all Pokemon
 *   node extractColorPalette.js --start=1 --end=151  # Process Pokemon 1-151
 *   node extractColorPalette.js --pokemon=pikachu   # Process single Pokemon
 *   node extractColorPalette.js --output=palettes.json  # Save to file
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// ============================================================================
// POKEMON DATA MAPS (embedded from your JSON files)
// ============================================================================

// Load the maps from your app directory
const SCRIPT_DIR = __dirname;
const APP_DIR = path.join(SCRIPT_DIR, '..', 'src', 'app');

let pokemonIdMap = {};
let speciesMap = {};
let animationMap = {};

try {
  pokemonIdMap = JSON.parse(fs.readFileSync(path.join(APP_DIR, 'pokemon-id-map-object.json'), 'utf8'));
  speciesMap = JSON.parse(fs.readFileSync(path.join(APP_DIR, 'speciesMap.json'), 'utf8'));
  animationMap = JSON.parse(fs.readFileSync(path.join(APP_DIR, 'animationMap.json'), 'utf8'));
} catch (e) {
  console.error('Warning: Could not load Pokemon data maps from src/app/. Make sure the script is in the scripts/ folder.');
  console.error(e.message);
}

// ============================================================================
// IMAGE URL LOGIC (matching your frontend logic from PokemonClientPage.tsx)
// ============================================================================

/**
 * Check if a pokemon is a form that shares the base species ID
 * e.g., arceus-fire has ID 493, same as base arceus
 * vs. venusaur-mega has unique ID 10033
 */
function isFormWithSharedId(pokemonName, pokemonId) {
  // If speciesMap has an entry for this ID and it's different from the pokemon name,
  // then this is a form sharing the base species ID
  const baseName = speciesMap[pokemonId];
  return baseName && baseName !== pokemonName;
}

/**
 * Get the base Pokemon name from a form name
 * e.g., "arceus-fire" -> "arceus", "pikachu-gmax" -> "pikachu"
 */
function getBasePokemonName(pokemonName) {
  // Look up in speciesMap to find the base name
  const pokemonId = pokemonIdMap[pokemonName];
  if (pokemonId && speciesMap[pokemonId]) {
    return speciesMap[pokemonId];
  }
  // Fallback: extract base name by taking everything before the first hyphen
  // (but be careful with Pokemon like "mr-mime" or "ho-oh")
  const baseName = pokemonName.split('-')[0];
  return baseName;
}

/**
 * Get form suffix from pokemon name
 * e.g., "arceus-fire" with baseName "arceus" -> "-fire"
 * Matches webapp logic: pokemonForm?.replace(pokemonData?.name ?? "", "")
 */
function getFormSuffix(pokemonName, baseName) {
  if (pokemonName === baseName) return '';
  // Remove the base name to get the suffix (e.g., "arceus-fire" -> "-fire")
  return pokemonName.replace(baseName, '');
}

/**
 * Get the PokeAPI sprite URL for a Pokemon (normal)
 * - For forms with shared base ID (like arceus-fire): uses baseId + suffix (493-fire.png)
 * - For forms with unique ID (like venusaur-mega): uses form ID directly (10033.png)
 * - For base Pokemon: uses ID directly
 */
function getPokeApiUrl(pokemonName, pokemonId) {
  if (isFormWithSharedId(pokemonName, pokemonId)) {
    // Form shares base ID, need suffix
    const baseName = speciesMap[pokemonId];
    const formSuffix = getFormSuffix(pokemonName, baseName);
    return `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@cb66bc8/sprites/pokemon/${pokemonId}${formSuffix}.png`;
  }
  // Base pokemon or form with unique ID - just use the ID
  return `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@cb66bc8/sprites/pokemon/${pokemonId}.png`;
}

/**
 * Get the PokeAPI sprite URL for a Pokemon (shiny)
 * For forms with base ID <= 650, uses {baseId}-{formSuffix} format (e.g., 479-heat.png)
 * This is different from normal sprites which use the form ID directly (e.g., 10008.png)
 */
function getPokeApiShinyUrl(pokemonName, pokemonId) {
  // Check if this is a form (name differs from species name for this ID)
  const baseSpeciesName = speciesMap[String(pokemonId)];
  
  if (baseSpeciesName && baseSpeciesName !== pokemonName) {
    // Form with shared base ID (like arceus-fire with ID 493)
    const formSuffix = getFormSuffix(pokemonName, baseSpeciesName);
    return `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@cb66bc8/sprites/pokemon/shiny/${pokemonId}${formSuffix}.png`;
  }
  
  // Check if this is a form with unique ID (like rotom-heat with ID 10008)
  // For these, shiny URLs use {baseId}-{formSuffix} format
  const animationMapValue = animationMap[pokemonName];
  if (animationMapValue) {
    const baseId = extractBaseIdFromAnimationKey(animationMapValue);
    if (baseId && baseId !== pokemonId && baseId <= 650) {
      // This is a form with unique ID but base species <= 650
      // Shiny URL uses baseId-formSuffix format (e.g., 479-heat.png for rotom-heat)
      const baseSpeciesNameFromMap = speciesMap[String(baseId)];
      if (baseSpeciesNameFromMap) {
        const formSuffix = getFormSuffix(pokemonName, baseSpeciesNameFromMap);
        return `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@cb66bc8/sprites/pokemon/shiny/${baseId}${formSuffix}.png`;
      }
    }
  }
  
  // Base pokemon or form without special handling - just use the ID
  return `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@cb66bc8/sprites/pokemon/shiny/${pokemonId}.png`;
}

/**
 * Get the PokeRogue sprite URL for a Pokemon (normal)
 */
function getPokeRogueUrl(pokemonName) {
  const animationMapKey = animationMap[pokemonName] || pokemonName;
  return `https://cdn.jsdelivr.net/gh/pagefaultgames/pokerogue@02cac77/public/images/pokemon/${animationMapKey}.png`;
}

/**
 * Get the PokeRogue sprite URL for a Pokemon (shiny)
 */
function getPokeRogueShinyUrl(pokemonName) {
  const animationMapKey = animationMap[pokemonName] || pokemonName;
  return `https://cdn.jsdelivr.net/gh/pagefaultgames/pokerogue@02cac77/public/images/pokemon/shiny/${animationMapKey}.png`;
}

/**
 * Check if a Pokemon has a form-specific sprite in animationMap
 * (i.e., the animationMap value differs from just the ID)
 */
function hasFormSpecificSprite(pokemonName, pokemonId) {
  const animationMapValue = animationMap[pokemonName];
  if (!animationMapValue) return false;
  
  // If animationMap value is different from the base ID, it's a form-specific sprite
  const baseIdStr = String(pokemonId);
  return animationMapValue !== baseIdStr && animationMapValue !== pokemonName;
}

/**
 * Get the base species ID for a form
 * Forms like deoxys-attack (ID 10001) have base species deoxys (ID 386)
 * This extracts the base ID from animationMap value (e.g., "386-attack" -> 386)
 */
function getBaseSpeciesId(pokemonName, pokemonId, debug = false) {
  // First check if this is a base species (ID exists in speciesMap)
  const speciesEntry = speciesMap[String(pokemonId)];
  if (speciesEntry) {
    if (debug) console.log(`  getBaseSpeciesId(${pokemonName}, ${pokemonId}): Found in speciesMap as "${speciesEntry}", returning ${pokemonId}`);
    return pokemonId;
  }
  
  // For forms, extract base ID from animationMap
  const animationMapValue = animationMap[pokemonName];
  if (animationMapValue) {
    const baseId = extractBaseIdFromAnimationKey(animationMapValue);
    if (debug) console.log(`  getBaseSpeciesId(${pokemonName}, ${pokemonId}): animationMap="${animationMapValue}", baseId=${baseId}`);
    if (baseId) return baseId;
  }
  
  // Fallback: return the pokemonId as-is
  if (debug) console.log(`  getBaseSpeciesId(${pokemonName}, ${pokemonId}): Fallback, returning ${pokemonId}`);
  return pokemonId;
}

// Debug flag - set to true to see detailed URL selection logic
let DEBUG_URL_SELECTION = false;

/**
 * Determine if a Pokemon should use PokeAPI or PokeRogue sprites (regular/non-shiny)
 * 
 * Rules:
 * - Base Pokemon (not forms) → PokeAPI
 * - Silvally forms → PokeRogue
 * - Xerneas forms → PokeRogue
 * - Forms with shared base ID >= 650 (vivillon, floette, etc.) → PokeRogue
 * - Forms with shared base ID < 650 (deerling, sawsbuck, arceus, etc.) → PokeAPI
 */
function shouldUsePokeApi(pokemonName, pokemonId) {
  // Silvally forms use PokeRogue (but base silvally uses PokeAPI)
  if (pokemonName.startsWith('silvally-')) {
    return false;
  }
  
  // Xerneas forms use PokeRogue (but base xerneas uses PokeAPI for regular)
  if (pokemonName.startsWith('xerneas-')) {
    return false;
  }
  
  // Check if this is a form with a shared base ID
  if (isFormWithSharedId(pokemonName, pokemonId)) {
    // Forms with base ID >= 650 use PokeRogue (vivillon, floette, etc.)
    // Forms with base ID < 650 use PokeAPI (deerling, sawsbuck, arceus, etc.)
    return pokemonId < 650;
  }
  
  // Base Pokemon use PokeAPI
  return true;
}

/**
 * Determine if shiny sprite should use PokeAPI
 * 
 * Rules:
 * - Base Pokemon (not forms) → PokeAPI
 * - Silvally forms → PokeRogue
 * - Xerneas (ALL - base shiny AND forms) → PokeRogue
 * - Forms with shared base ID >= 650 → PokeRogue
 * - Forms with shared base ID < 650 → PokeAPI
 */
function shouldUsePokeApiForShiny(pokemonName, pokemonId) {
  // Silvally forms use PokeRogue
  if (pokemonName.startsWith('silvally-')) {
    return false;
  }
  
  // Xerneas - ALL shiny sprites use PokeRogue (base and forms)
  if (pokemonName === 'xerneas' || pokemonName.startsWith('xerneas-')) {
    return false;
  }
  
  // Check if this is a form with a shared base ID
  if (isFormWithSharedId(pokemonName, pokemonId)) {
    // Forms with base ID >= 650 use PokeRogue
    // Forms with base ID < 650 use PokeAPI
    return pokemonId < 650;
  }
  
  // Base Pokemon use PokeAPI
  return true;
}

/**
 * Get shiny sprite URL
 * Uses base species ID to determine PokeAPI vs PokeRogue
 * Web app uses >= 650 for PokeRogue shiny (meaning < 650 for PokeAPI)
 */
function getShinyPokemonSpriteURL(pokemonName, pokemonId) {
  const pokeApiShinyURL = getPokeApiShinyUrl(pokemonName, pokemonId);
  const pokeRogueShinyURL = getPokeRogueShinyUrl(pokemonName);
  
  // Special cases that always use PokeRogue shiny (IDs containing 10043 or 10044)
  const idStr = String(pokemonId);
  if (idStr.includes('10043') || idStr.includes('10044')) {
    return { url: pokeRogueShinyURL, source: 'pokerogue-shiny' };
  }
  
  // Use base species ID to determine source (< 650 for shiny, not <= 650)
  if (shouldUsePokeApiForShiny(pokemonName, pokemonId)) {
    return { url: pokeApiShinyURL, source: 'pokeapi-shiny' };
  }
  
  return { url: pokeRogueShinyURL, source: 'pokerogue-shiny' };
}

/**
 * Determine which image URL to use based on Pokemon
 * Uses base species ID to determine PokeAPI vs PokeRogue
 */
function getPokemonSpriteURL(pokemonName, pokemonId) {
  const pokeApiURL = getPokeApiUrl(pokemonName, pokemonId);
  const pokeRogueURL = getPokeRogueUrl(pokemonName);
  
  if (shouldUsePokeApi(pokemonName, pokemonId)) {
    // Special case for zygarde-10
    if (pokemonName === 'zygarde-10') {
      return { 
        url: 'https://cdn.jsdelivr.net/gh/PokeAPI/sprites@cb66bc8/sprites/pokemon/10118.png', 
        source: 'pokeapi' 
      };
    }
    return { url: pokeApiURL, source: 'pokeapi' };
  }
  
  return { url: pokeRogueURL, source: 'pokerogue' };
}

/**
 * Extract base ID from animationMap value
 * e.g., "666-meadow" -> 666, "493-fire" -> 493
 */
function extractBaseIdFromAnimationKey(animationKey) {
  const match = animationKey.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

// ============================================================================
// ZA MEGAS (Legends ZA) - local sprites from src/app/sprites/
// ============================================================================

const ZA_MEGAS_START_ID = 10278;
const ZA_MEGAS_END_ID = 10325;
const SPRITES_DIR = path.join(APP_DIR, 'sprites');

/**
 * Get local file path for a ZA mega sprite (format: {id}.png)
 */
function getZaMegaLocalPath(pokemonId, isShiny) {
  const folder = isShiny ? 'shiny' : 'normal';
  return path.join(SPRITES_DIR, folder, `${pokemonId}.png`);
}

/**
 * Get ZA mega Pokemon from pokemon-id-map (IDs 10278-10325, starting with clefable-mega).
 * Returns list of { name, id, isShiny } — no url/source; images come from local sprites.
 */
function getZaMegaPokemon(options = {}) {
  const { includeShiny = true } = options;
  const pokemon = [];

  for (const [name, id] of Object.entries(pokemonIdMap)) {
    const pokemonId = typeof id === 'string' ? parseInt(id, 10) : id;
    if (pokemonId < ZA_MEGAS_START_ID || pokemonId > ZA_MEGAS_END_ID) continue;

    pokemon.push({ name, id: pokemonId, isShiny: false });
    if (includeShiny) {
      pokemon.push({ name, id: pokemonId, isShiny: true });
    }
  }

  return pokemon.sort((a, b) => {
    if (a.id !== b.id) return a.id - b.id;
    return a.isShiny ? 1 : -1;
  });
}

/**
 * Process a single ZA mega using local sprite. Skips if file missing.
 */
async function processPokemonZaMega(pokemon, options = {}) {
  const { verbose = false } = options;
  const isShiny = pokemon.isShiny || false;
  const localPath = getZaMegaLocalPath(pokemon.id, isShiny);

  try {
    if (!fs.existsSync(localPath)) {
      if (verbose) {
        const label = isShiny ? ' [SHINY]' : '';
        console.log(`  Skipping ${pokemon.name}${label} (${pokemon.id}): no local sprite`);
      }
      return null; // skip
    }

    if (verbose) {
      const label = isShiny ? ' [SHINY]' : '';
      console.log(`  Reading local ${pokemon.name}${label}: ${localPath}`);
    }

    const imageBuffer = fs.readFileSync(localPath);
    const palette = await extractColorPaletteFromImage(imageBuffer, {
      pokemonId: pokemon.id,
    });

    return {
      id: pokemon.id,
      name: pokemon.name,
      isShiny,
      source: 'za-megas-local',
      url: '',
      palette: palette.palette,
      primaryColors: palette.primaryColors,
      hexColors: palette.hexColors,
      rgbColors: palette.rgbColors,
      dimensions: palette.dimensions,
      success: true,
    };
  } catch (error) {
    return {
      id: pokemon.id,
      name: pokemon.name,
      isShiny,
      source: 'za-megas-local',
      url: '',
      error: error.message,
      success: false,
    };
  }
}

/**
 * Process all ZA megas from local sprites. Skips variants with no file.
 */
async function processAllPokemonZaMegas(options = {}) {
  const { includeShiny = true, shinyOnly = false, concurrency = 5, verbose = false } = options;

  let list = getZaMegaPokemon({ includeShiny });
  if (shinyOnly) list = list.filter((p) => p.isShiny);

  const toProcess = [];
  for (const p of list) {
    const localPath = getZaMegaLocalPath(p.id, p.isShiny);
    if (fs.existsSync(localPath)) toProcess.push(p);
  }

  const skipped = list.length - toProcess.length;
  console.log(`Processing ${toProcess.length} ZA megas from local sprites (${skipped} skipped, no file)...`);

  const results = [];
  let processed = 0;

  for (let i = 0; i < toProcess.length; i += concurrency) {
    const batch = toProcess.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((p) => processPokemonZaMega(p, { verbose }))
    );

    for (const r of batchResults) {
      if (r !== null) results.push(r);
    }
    processed += batch.length;
    const ok = batchResults.filter((r) => r && r.success).length;
    const fail = batchResults.filter((r) => r && !r.success).length;
    console.log(`  [${processed}/${toProcess.length}] Batch: ${ok} ok, ${fail} failed`);
  }

  return results;
}

/**
 * Get all Pokemon to process (includes both normal and shiny variants)
 * Combines pokemon-id-map-object.json and animationMap.json to ensure no forms are missed
 * @param {Object} options - Options
 * @param {boolean} options.includeShiny - Whether to include shiny variants (default: true)
 */
function getAllPokemon(options = {}) {
  const { includeShiny = true } = options;
  const pokemon = [];
  const processedNames = new Set();
  
  // First, process all Pokemon from pokemon-id-map-object.json
  for (const [name, id] of Object.entries(pokemonIdMap)) {
    const pokemonId = typeof id === 'string' ? parseInt(id, 10) : id;
    processedNames.add(name);
    
    // Add normal variant
    pokemon.push({
      name,
      id: pokemonId,
      isShiny: false,
      ...getPokemonSpriteURL(name, pokemonId)
    });
    
    // Add shiny variant
    if (includeShiny) {
      pokemon.push({
        name,
        id: pokemonId,
        isShiny: true,
        ...getShinyPokemonSpriteURL(name, pokemonId)
      });
    }
  }
  
  // Then, add any forms from animationMap.json that aren't in pokemon-id-map-object.json
  // This catches forms like vivillon variants, sawsbuck forms, etc.
  for (const [name, animationKey] of Object.entries(animationMap)) {
    if (processedNames.has(name)) continue;
    
    // Extract base ID from animation key (e.g., "666-meadow" -> 666)
    const baseId = extractBaseIdFromAnimationKey(animationKey);
    if (!baseId) continue;
    
    processedNames.add(name);
    
    // Add normal variant - check shouldUsePokeApi to determine source
    pokemon.push({
      name,
      id: baseId,
      isShiny: false,
      ...getPokemonSpriteURL(name, baseId)
    });
    
    // Add shiny variant
    if (includeShiny) {
      pokemon.push({
        name,
        id: baseId,
        isShiny: true,
        ...getShinyPokemonSpriteURL(name, baseId)
      });
    }
  }
  
  // Sort by ID, then by name (for forms with same ID), then by isShiny
  return pokemon.sort((a, b) => {
    if (a.id !== b.id) return a.id - b.id;
    if (a.name !== b.name) return a.name.localeCompare(b.name);
    return a.isShiny ? 1 : -1;
  });
}

// ============================================================================
// IMAGE FETCHING
// ============================================================================

/**
 * Fetch image from URL and return as buffer
 */
function fetchImage(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const request = protocol.get(url, (response) => {
      // Handle redirects
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        fetchImage(response.headers.location).then(resolve).catch(reject);
        return;
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to fetch ${url}: HTTP ${response.statusCode}`));
        return;
      }
      
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    });
    
    request.on('error', reject);
    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error(`Timeout fetching ${url}`));
    });
  });
}

/**
 * Fetch image with fallback URLs (matching webapp behavior)
 * @param {string} primaryUrl - Primary image URL to try first
 * @param {string[]} fallbackUrls - Array of fallback URLs to try if primary fails
 * @returns {Promise<{buffer: Buffer, usedUrl: string, wasFallback: boolean}>}
 */
async function fetchImageWithFallback(primaryUrl, fallbackUrls = []) {
  try {
    const buffer = await fetchImage(primaryUrl);
    return { buffer, usedUrl: primaryUrl, wasFallback: false };
  } catch (primaryError) {
    // Try each fallback URL in order
    for (let i = 0; i < fallbackUrls.length; i++) {
      const fallbackUrl = fallbackUrls[i];
      try {
        const buffer = await fetchImage(fallbackUrl);
        return { buffer, usedUrl: fallbackUrl, wasFallback: true, fallbackIndex: i };
      } catch (fallbackError) {
        // Continue to next fallback
        continue;
      }
    }
    // All URLs failed
    throw new Error(`All image URLs failed. Primary: ${primaryError.message}`);
  }
}

/**
 * Crop transparent and white pixels from image edges (matches frontend cropWhitespace in image.js)
 * Trims: fully transparent (alpha === 0), near-transparent (alpha < 16), and near-white padding (r,g,b >= 248).
 * Returns a buffer of the cropped PNG, or the original buffer if cropping fails/skips.
 * @param {Buffer} imageBuffer - Raw image buffer (PNG)
 * @returns {Promise<Buffer>} Cropped image buffer
 */
async function cropWhitespace(imageBuffer) {
  let sharp;
  try {
    sharp = require('sharp');
  } catch (e) {
    return imageBuffer;
  }

  const { data, info } = await sharp(imageBuffer)
    .raw()
    .ensureAlpha()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const pixels = data;
  const hasAlpha = channels >= 4;

  function isEmpty(i) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const a = hasAlpha ? pixels[i + 3] : 255;
    // Transparent or near-transparent
    if (a < 16) return true;
    // Near-white padding (common in sprite sources)
    if (r >= 248 && g >= 248 && b >= 248) return true;
    return false;
  }

  let top = height;
  let bottom = -1;
  let left = width;
  let right = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      if (!isEmpty(i)) {
        if (y < top) top = y;
        if (y > bottom) bottom = y;
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }
  }

  if (bottom < top || right < left) {
    return imageBuffer;
  }

  const croppedWidth = right - left + 1;
  const croppedHeight = bottom - top + 1;

  if (croppedWidth <= 0 || croppedHeight <= 0) {
    return imageBuffer;
  }

  const croppedBuffer = await sharp(imageBuffer)
    .extract({ left, top, width: croppedWidth, height: croppedHeight })
    .png()
    .toBuffer();

  return croppedBuffer;
}

/**
 * Save image buffer to local file
 */
async function saveImageToFile(buffer, filePath) {
  const dir = path.dirname(filePath);

  // Create directory if it doesn't exist
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filePath, buffer);
}

function getFilename(pokemonName, pokemonId) {
  // Check if this is a form with a shared base ID
  if (isFormWithSharedId(pokemonName, pokemonId)) {
    const baseName = speciesMap[pokemonId];
    const formSuffix = getFormSuffix(pokemonName, baseName);
    return `${pokemonId}${formSuffix}.png`;
  } else {
    return `${pokemonId}.png`;
  }
}

/**
 * Get the local file path for a Pokemon sprite
 * For forms with shared base ID (like arceus-fire, sawsbuck-summer), 
 * includes the form suffix: 493-fire.png, 586-summer.png
 */
function getLocalImagePath(downloadDir, pokemonName, pokemonId, isShiny) {
  const shinyFolder = isShiny ? 'shiny' : 'normal';
  
  const filename = getFilename(pokemonName, pokemonId);
  
  return path.join(downloadDir, shinyFolder, filename);
}

/**
 * Get fallback URLs for a Pokemon (matching webapp onerror behavior)
 * The webapp falls back to PokeAPI with just the Pokemon ID
 * @param {number} pokemonId - Pokemon ID
 * @param {string} pokemonName - Pokemon name
 * @param {boolean} isShiny - Whether this is a shiny variant
 */
function getFallbackUrls(pokemonId, pokemonName, isShiny = false) {
  const fallbacks = [];
  const animationMapKey = animationMap[pokemonName] || pokemonName;
  
  // Determine if this is a form with shared ID that needs suffix
  const hasSharedId = isFormWithSharedId(pokemonName, pokemonId);
  let formSuffix = '';
  if (hasSharedId) {
    const baseName = speciesMap[pokemonId];
    formSuffix = getFormSuffix(pokemonName, baseName);
  }
  
  if (isShiny) {
    // Shiny fallbacks
    // 1. PokeAPI shiny (with suffix if shared ID form)
    fallbacks.push(`https://cdn.jsdelivr.net/gh/PokeAPI/sprites@cb66bc8/sprites/pokemon/shiny/${pokemonId}${formSuffix}.png`);
    // 2. PokeAPI shiny with just base ID (in case form suffix URL doesn't exist)
    if (formSuffix) {
      fallbacks.push(`https://cdn.jsdelivr.net/gh/PokeAPI/sprites@cb66bc8/sprites/pokemon/shiny/${pokemonId}.png`);
    }
    // 3. PokeRogue shiny with animationMapKey
    fallbacks.push(`https://cdn.jsdelivr.net/gh/pagefaultgames/pokerogue@02cac77/public/images/pokemon/shiny/${animationMapKey}.png`);
    // 4. PokeRogue shiny with just ID
    fallbacks.push(`https://cdn.jsdelivr.net/gh/pagefaultgames/pokerogue@02cac77/public/images/pokemon/shiny/${pokemonId}.png`);
  } else {
    // Normal fallbacks
    // 1. PokeAPI (with suffix if shared ID form)
    fallbacks.push(`https://cdn.jsdelivr.net/gh/PokeAPI/sprites@cb66bc8/sprites/pokemon/${pokemonId}${formSuffix}.png`);
    // 2. PokeAPI with just base ID (in case form suffix URL doesn't exist)
    if (formSuffix) {
      fallbacks.push(`https://cdn.jsdelivr.net/gh/PokeAPI/sprites@cb66bc8/sprites/pokemon/${pokemonId}.png`);
    }
    // 3. PokeRogue with animationMapKey
    fallbacks.push(`https://cdn.jsdelivr.net/gh/pagefaultgames/pokerogue@02cac77/public/images/pokemon/${animationMapKey}.png`);
    // 4. PokeRogue with just ID
    fallbacks.push(`https://cdn.jsdelivr.net/gh/pagefaultgames/pokerogue@02cac77/public/images/pokemon/${pokemonId}.png`);
  }
  
  return fallbacks;
}

// ============================================================================
// COLOR CONVERSION UTILITIES
// ============================================================================

function RGBtoHSV(r, g, b) {
  if (arguments.length === 1) {
    g = r[1];
    b = r[2];
    r = r[0];
  }

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max / 255;

  if (d !== 0) {
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
      default:
        break;
    }
  }

  return { h, s, v };
}

function RGBToHSL(rgb) {
  const r = rgb[0];
  const g = rgb[1];
  const b = rgb[2];
  
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rNorm) {
      h = ((gNorm - bNorm) / delta) % 6;
    } else if (max === gNorm) {
      h = (bNorm - rNorm) / delta + 2;
    } else {
      h = (rNorm - gNorm) / delta + 4;
    }
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  return { h, s, l };
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(x).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

// ============================================================================
// COLOR EXTRACTION FROM PIXELS
// ============================================================================

/**
 * Helper function to round colors for grouping similar shades
 * (matches webapp's roundColor function)
 */
function roundColor(value, precision) {
  return Math.round(value / precision) * precision;
}

/**
 * Check if a pixel is surrounded by transparent pixels (outline detection)
 * (matches webapp's isSurroundedByTransparent function)
 */
function isSurroundedByTransparent(x, y, width, height, pixelData) {
  const index = (y * width + x) * 4;
  
  // Skip fully transparent pixels
  if (pixelData[index + 3] === 0) return true;
  
  const neighborOffsets = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  
  for (const [dx, dy] of neighborOffsets) {
    const nx = x + dx;
    const ny = y + dy;
    
    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
      const ni = (ny * width + nx) * 4;
      const alpha = pixelData[ni + 3];
      if (alpha === 0) return true; // If any neighbor is transparent
    }
  }
  
  return false;
}

/**
 * Extract colors from raw pixel data (RGBA buffer)
 * Matches the webapp's color extraction logic exactly
 */
function extractColorsFromPixels(pixelData, width, height) {
  let colorCount = {};
  
  // First pass: extract colors with precision 1 (no rounding)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      const r = roundColor(pixelData[index], 1);
      const g = roundColor(pixelData[index + 1], 1);
      const b = roundColor(pixelData[index + 2], 1);
      const a = pixelData[index + 3];
      
      // Skip transparent pixels (matches webapp: a === 0)
      if (a === 0) continue;
      
      // Calculate brightness and skip near-black (matches webapp: brightness < 26.5)
      const brightness = (r + g + b) / 3;
      if (brightness < 26.5) continue;
      
      // Skip outline-adjacent dark pixels (matches webapp)
      if (isSurroundedByTransparent(x, y, width, height, pixelData) && brightness < 35) continue;
      
      const color = `${r},${g},${b}`;
      colorCount[color] = (colorCount[color] || 0) + 1;
    }
  }
  
  // If too many unique colors (>30), re-extract with higher precision grouping
  // (matches webapp's logic)
  if (Object.keys(colorCount).length > 30) {
    colorCount = {};
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        const r = roundColor(pixelData[index], 60);
        const g = roundColor(pixelData[index + 1], 60);
        const b = roundColor(pixelData[index + 2], 60);
        const a = pixelData[index + 3];
        
        // Skip transparent pixels
        if (a === 0) continue;
        
        // Calculate brightness and skip near-black
        const brightness = (r + g + b) / 3;
        if (brightness < 26.5) continue;
        
        // Skip outline-adjacent dark pixels
        if (isSurroundedByTransparent(x, y, width, height, pixelData) && brightness < 35) continue;
        
        const color = `${r},${g},${b}`;
        colorCount[color] = (colorCount[color] || 0) + 1;
      }
    }
  }
  
  // Convert to array, sort by frequency
  const colors = Object.entries(colorCount)
    .sort((a, b) => b[1] - a[1])
    .map(([color, count]) => {
      const rgbColors = color.split(',').map(Number);
      return {
        color: rgbColors,
        count,
        hex: rgbToHex(rgbColors[0], rgbColors[1], rgbColors[2])
      };
    });
  
  return colors;
}

// ============================================================================
// COLOR CLUSTERING (MEDIAN CUT ALGORITHM)
// ============================================================================

function medianCutQuantize(colors, numColors = 16) {
  if (colors.length <= numColors) {
    return colors;
  }
  
  let buckets = [colors];
  
  while (buckets.length < numColors) {
    let maxRange = -1;
    let maxBucketIndex = 0;
    let maxChannel = 0;
    
    for (let i = 0; i < buckets.length; i++) {
      const bucket = buckets[i];
      if (bucket.length < 2) continue;
      
      for (let channel = 0; channel < 3; channel++) {
        const values = bucket.map(c => c.color[channel]);
        const range = Math.max(...values) - Math.min(...values);
        if (range > maxRange) {
          maxRange = range;
          maxBucketIndex = i;
          maxChannel = channel;
        }
      }
    }
    
    if (maxRange <= 0) break;
    
    const bucket = buckets[maxBucketIndex];
    bucket.sort((a, b) => a.color[maxChannel] - b.color[maxChannel]);
    
    const median = Math.floor(bucket.length / 2);
    const bucket1 = bucket.slice(0, median);
    const bucket2 = bucket.slice(median);
    
    buckets.splice(maxBucketIndex, 1, bucket1, bucket2);
  }
  
  return buckets.map(bucket => {
    const totalCount = bucket.reduce((sum, c) => sum + c.count, 0);
    const avgR = Math.round(bucket.reduce((sum, c) => sum + c.color[0] * c.count, 0) / totalCount);
    const avgG = Math.round(bucket.reduce((sum, c) => sum + c.color[1] * c.count, 0) / totalCount);
    const avgB = Math.round(bucket.reduce((sum, c) => sum + c.color[2] * c.count, 0) / totalCount);
    
    return {
      color: [avgR, avgG, avgB],
      count: totalCount,
      hex: rgbToHex(avgR, avgG, avgB)
    };
  }).sort((a, b) => b.count - a.count);
}

// ============================================================================
// SPECIAL POKEMON CASES (from your color.js)
// ============================================================================

// colorDistance: use HSL distance instead of color distance
// topNColors: change the number of colors for the topN algorithm
// mostFrequent: change the hueBinSize to include most frequent color
// leastBoringColor: change minimum count of the least boring color
// handPickedColors: custom colors for the pokemon
const specialPokemonCases = {
  // Iron Treads
  990: { type: "colorDistance" },
  // Lechonk
  915: { type: "colorDistance" },
  // Dragapult
  887: { type: "topNColors", value: 7 },
  // Swalot
  317: { type: "topNColors", value: 8 },
  // Mamoswine
  473: { type: "topNColors", value: 8 },
  // Musharna
  518: { type: "topNColors", value: 4 },
  // Cinccino
  573: { type: "topNColors", value: 5 },
  // Beedrill
  15: { type: "topNColors", value: 5 },
  // Meowth
  52: { type: "topNColors", value: 5 },
  // Frosmoth
  873: { type: "topNColors", value: 5 },
  // Starly
  396: { type: "topNColors", value: 4 },
  // Amoonguss
  591: { type: "topNColors", value: 4 },
  // Barraskewda
  847: { type: "topNColors", value: 4 },
  // Snubbull
  209: { type: "topNColors", value: 4 },
  // Sharpedo
  319: { type: "topNColors", value: 7 },
  // Blastoise
  9: { type: "mostFrequent", value: 50 },
  // Yamask
  562: { type: "leastBoringColor", value: 23 },
  // Pikachu
  25: {
    type: "handPickedColors",
    value: [
      ["246", "230", "82"],
      ["41", "41", "41"],
      ["197", "32", "24"],
    ],
  },
  // Empoleon
  395: {
    type: "handPickedColors",
    value: [
      ["82", "139", "230"],
      ["16", "32", "65"],
      ["238", "205", "98"],
    ],
  },
  // Walking Wake
  1009: {
    type: "handPickedColors",
    value: [
      ["46", "149", "167"],
      ["53", "194", "219"],
      ["165", "103", "167"],
    ],
  },
  // Emolga
  587: {
    type: "handPickedColors",
    value: [
      ["255", "213", "0"],
      ["255", "255", "255"],
      ["65", "65", "65"],
    ],
  },
  // Torkoal
  324: {
    type: "handPickedColors",
    value: [
      ["189", "172", "164"],
      ["98", "98", "98"],
      ["238", "131", "65"],
    ],
  },
  // Unfezant
  521: {
    type: "handPickedColors",
    value: [
      ["65", "65", "82"],
      ["255", "65", "123"],
      ["49", "115", "74"],
    ],
  },
  // Hitmonchan
  107: {
    type: "handPickedColors",
    value: [
      ["205", "180", "123"],
      ["197", "180", "197"],
      ["189", "49", "74"],
    ],
  },
  // Frigibax
  996: {
    type: "handPickedColors",
    value: [
      ["144", "154", "165"],
      ["195", "232", "234"],
      ["223", "224", "223"],
    ],
  },
  // Ampharos
  181: {
    type: "handPickedColors",
    value: [
      ["255", "238", "74"],
      ["255", "197", "16"],
    ],
  },
};

// ============================================================================
// SMART COLOR SELECTION
// ============================================================================

function getHueGroupKey(color, hueBinSize = 60) {
  const hsv = RGBtoHSV(color[0], color[1], color[2]);
  const hue = Math.round((hsv.h * 360) / hueBinSize) * hueBinSize;
  return `hue-${hue}`;
}

function colorDistance(c1, c2) {
  return Math.sqrt(
    Math.pow(c1[0] - c2[0], 2) +
    Math.pow(c1[1] - c2[1], 2) +
    Math.pow(c1[2] - c2[2], 2)
  );
}

function hslDistance(rgb1, rgb2) {
  const hsl1 = RGBToHSL(rgb1);
  const hsl2 = RGBToHSL(rgb2);

  // Compute hue difference, normalized to [0, 1]
  let hueDiff = Math.abs(hsl1.h - hsl2.h);
  hueDiff = Math.min(hueDiff, 360 - hueDiff) / 180;

  // Normalize saturation and lightness differences to [0, 1]
  const sDiff = (hsl1.s * 100 - hsl2.s * 100) / 100;
  const lDiff = (hsl1.l * 100 - hsl2.l * 100) / 100;

  const avgSaturation = (hsl1.s * 100 + hsl2.s * 100) / 2 / 100;
  const avgLightness = (hsl1.l * 100 + hsl2.l * 100) / 2 / 100;
  const sSimilarity = 1 - Math.abs(hsl1.s * 100 - hsl2.s * 100) / 100;
  const lSimilarity = 1 - Math.abs(hsl1.l * 100 - hsl2.l * 100) / 100;

  // If both saturation and lightness are low AND similar, hue matters less
  const muteFactor =
    avgSaturation < 0.3 &&
    avgLightness < 0.3 &&
    sSimilarity > 0.8 &&
    lSimilarity > 0.8
      ? 0.5 // reduce hue impact
      : 2;  // otherwise, emphasize hue

  const adjustedHue = hueDiff * muteFactor;

  return Math.sqrt(adjustedHue ** 2 + sDiff ** 2 + lDiff ** 2);
}

function arraysAreEqual(arr1, arr2) {
  if (arr1.length !== arr2.length) {
    return false;
  }
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) {
      return false;
    }
  }
  return true;
}

function getCombinations(arr, k) {
  const results = [];
  function helper(start, combo) {
    if (combo.length === k) {
      results.push(combo);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      helper(i + 1, combo.concat([arr[i]]));
    }
  }
  helper(0, []);
  return results;
}

/**
 * Order colors by luminance - MUTATES the array in place (matches webapp)
 */
function orderByLuminance(colors) {
  // Sort in place (mutates original array) - matches webapp's colors.sort()
  colors.sort((p1, p2) => {
    const c1Low = p1.count < 17;
    const c2Low = p2.count < 17;

    if (c1Low && c2Low) return 0;
    if (c1Low) return 1;
    if (c2Low) return -1;

    const hsv1 = RGBtoHSV(p1.color[0], p1.color[1], p1.color[2]);
    const hsv2 = RGBtoHSV(p2.color[0], p2.color[1], p2.color[2]);
    return hsv2.v + hsv2.s - (hsv1.v + hsv1.s);
  });

  // Step 1: If one color has much higher count, put it first
  const dominant = colors.find((c) =>
    colors.every((other) => other === c || c.count >= 1.29 * other.count)
  );

  const doesDominantColorHaveSimilarShadeAndIsDark =
    !!dominant &&
    !!colors.find((c) => {
      const hslA = RGBToHSL(c.color);
      const hslB = RGBToHSL(dominant.color);
      const hueDiff = Math.abs(hslA.h - hslB.h);
      return hslA.h !== hslB.h && hueDiff < 10 && hslB.l * 100 < 20;
    });

  const isDominantColorBoring =
    !!dominant &&
    (() => {
      const hsl = RGBToHSL(dominant.color);
      return hsl.s * 100 < 5 || (hsl.s * 100 < 20 && hsl.l * 100 < 20);
    })();

  const isSuperDominant =
    !!dominant &&
    colors.every(
      (other) => other === dominant || dominant.count >= 3 * other.count
    );

  if (
    isSuperDominant ||
    (!!dominant &&
      !doesDominantColorHaveSimilarShadeAndIsDark &&
      !isDominantColorBoring)
  ) {
    const index = colors.indexOf(dominant);
    if (index > 0) {
      colors.splice(index, 1);
      colors.unshift(dominant);
    }
  }

  // Step 2: Adjust if first color is too low in count
  if (
    colors.length >= 3 &&
    colors[0].count < 0.7 * colors[1].count &&
    colors[0].count < 0.7 * colors[2].count
  ) {
    const [tooLow] = colors.splice(0, 1);
    colors.push(tooLow);

    // Re-sort new first two by luminance (v + s)
    colors.splice(
      0,
      2,
      ...colors.slice(0, 2).sort((a, b) => {
        const aHSV = RGBtoHSV(a.color[0], a.color[1], a.color[2]);
        const bHSV = RGBtoHSV(b.color[0], b.color[1], b.color[2]);
        return bHSV.v + bHSV.s - (aHSV.v + aHSV.s);
      })
    );
  }
  
  // No return - mutates in place like webapp
}

/**
 * Get the most unique/representative colors from a list
 * This matches your frontend getMostUniqueColors function with all special cases
 */
function getMostUniqueColors(colorList, pokemonId = null, topN = 6, pickCount = 3, minCount = 17) {
  const colorListWithIds = colorList.map((c, i) => ({
    ...c,
    id: c.id ?? i,
  }));

  // Handle handPickedColors special case
  if (specialPokemonCases[pokemonId]?.type === "handPickedColors") {
    const colors = specialPokemonCases[pokemonId].value;
    const nonPickedColors = colorListWithIds.filter(
      (c) => !colors.some((c2) => arraysAreEqual(c.color.map(String), c2))
    );
    const pickedColors = colors.map((handPickedColor) => {
      // Find matching color in the list or create one
      const match = colorListWithIds.find((c) => 
        arraysAreEqual(c.color.map(String), handPickedColor)
      );
      if (match) return match;
      // If not found in extracted colors, create a synthetic entry
      return {
        color: handPickedColor.map(Number),
        hex: rgbToHex(...handPickedColor.map(Number)),
        count: 9999, // High count to ensure it's prioritized
        id: `handpicked-${handPickedColor.join('-')}`
      };
    });
    return [...pickedColors, ...nonPickedColors];
  }

  // Determine topN based on special cases
  const effectiveTopN = specialPokemonCases[pokemonId]?.type === "topNColors"
    ? specialPokemonCases[pokemonId].value
    : topN;

  const topColors = colorListWithIds
    .slice()
    .sort((a, b) => b.count - a.count)
    .slice(0, effectiveTopN)
    .filter((c) => c.count >= minCount);

  if (topColors.length === 0) {
    return colorListWithIds.slice(0, pickCount);
  }

  const combinations = getCombinations(
    topColors,
    Math.min(pickCount, topColors.length)
  );

  let bestCombo = [];
  let maxDistance = -Infinity;

  for (const combo of combinations) {
    let totalDist = 0;
    for (let i = 0; i < combo.length; i++) {
      for (let j = i + 1; j < combo.length; j++) {
        // Use hslDistance for colorDistance special case
        if (specialPokemonCases[pokemonId]?.type === "colorDistance") {
          totalDist += hslDistance(combo[i].color, combo[j].color);
        } else {
          totalDist += colorDistance(combo[i].color, combo[j].color);
        }
      }
    }
    if (totalDist > maxDistance) {
      maxDistance = totalDist;
      bestCombo = combo;
    }
  }

  // Step 3: Replace each with the brightest shade in its hue group
  let bestHueKeys = [...new Set(bestCombo.map((c) => getHueGroupKey(c.color)))];

  let loweredHueBinSize = false;
  let hueBinSize = 35;

  while (bestHueKeys.length < 3 && hueBinSize > 10) {
    hueBinSize -= 5;
    bestHueKeys = [
      ...new Set(bestCombo.map((c) => getHueGroupKey(c.color, hueBinSize))),
    ];
    loweredHueBinSize = true;
  }

  let bestComboWithSmartShades = bestHueKeys
    .map((hueKey) => {
      const sameHueColors = colorListWithIds.filter(
        (c) => getHueGroupKey(c.color, loweredHueBinSize ? hueBinSize : 60) === hueKey
      );
      if (sameHueColors.length === 0) return null;
      
      const maxCount = Math.max(...sameHueColors.map((c) => c.count));
      const threshold = maxCount * 0.85;
      const candidates = sameHueColors.filter((c) => c.count >= threshold);
      
      return candidates.reduce((brightest, c) => {
        const v1 = RGBtoHSV(c.color[0], c.color[1], c.color[2]).v;
        const v2 = RGBtoHSV(brightest.color[0], brightest.color[1], brightest.color[2]).v;
        return v1 > v2 ? c : brightest;
      }, candidates[0]);
    })
    .filter(Boolean)
    .sort((a, b) => b.count - a.count);

  // Step 4: If the most frequent color is not in the 3, try replacing a similar hue
  const mostFrequent = colorListWithIds[0];
  const isIncluded = bestComboWithSmartShades.some(
    (c) => c.id === mostFrequent.id
  );

  if (!isIncluded && mostFrequent) {
    // Use special hueBinSize for mostFrequent case
    const mfHueBinSize = specialPokemonCases[pokemonId]?.type === "mostFrequent"
      ? specialPokemonCases[pokemonId].value
      : 60;
    const mfHue = getHueGroupKey(mostFrequent.color, mfHueBinSize);
    const matchIndex = bestComboWithSmartShades.findIndex(
      (c) => getHueGroupKey(c.color, mfHueBinSize) === mfHue
    );
    if (matchIndex !== -1) {
      bestComboWithSmartShades[matchIndex] = mostFrequent;
    }
  }

  // Step 4.5: Replace very dark shades if brighter alternative exists with similar count
  // Don't do it for colorDistance special cases
  if (specialPokemonCases[pokemonId]?.type !== "colorDistance") {
    bestComboWithSmartShades = bestComboWithSmartShades.map((current, i, arr) => {
      const currentSum = current.color.reduce((a, b) => a + b, 0);

      if (currentSum < 225 || (RGBtoHSV(current.color[0], current.color[1], current.color[2]).s < 0.1 && currentSum < 280)) {
        const maxCount = current.count;
        const thresholdUpper = maxCount * 1.3;
        const thresholdLower = maxCount * 0.7;

        const brighterCandidates = colorListWithIds.filter((c) => {
          const sum = c.color.reduce((a, b) => a + b, 0);
          return (
            sum > currentSum &&
            c.count >= thresholdLower &&
            c.count <= thresholdUpper &&
            !arr.some(
              (other) =>
                other.id !== current.id &&
                getHueGroupKey(other.color) === getHueGroupKey(c.color)
            )
          );
        });

        if (brighterCandidates.length > 0) {
          return brighterCandidates.reduce((brightest, c) => {
            const v1 = RGBtoHSV(c.color[0], c.color[1], c.color[2]).v;
            const v2 = RGBtoHSV(brightest.color[0], brightest.color[1], brightest.color[2]).v;
            return v1 > v2 ? c : brightest;
          }, brighterCandidates[0]);
        }
      }

      return current;
    });
  }

  // Step 4.6: Replace similar-brightness color (within 10) with most common remaining color
  for (let i = 0; i < bestComboWithSmartShades.length; i++) {
    for (let j = i + 1; j < bestComboWithSmartShades.length; j++) {
      const a = bestComboWithSmartShades[i];
      const b = bestComboWithSmartShades[j];

      const hslA = RGBToHSL(a.color);
      const hslB = RGBToHSL(b.color);
      const brightnessDiff = Math.abs(hslA.l * 100 - hslB.l * 100);
      const hueDiff = Math.abs(hslA.h - hslB.h);

      if (brightnessDiff <= 10 && hueDiff <= 10) {
        const weaker = a.count < b.count ? a : b;
        const hueKeysInUse = new Set(
          bestComboWithSmartShades.map((c) => getHueGroupKey(c.color))
        );

        const replacement = colorListWithIds
          .slice(0, 6)
          .find(
            (c) =>
              !bestComboWithSmartShades.some((sel) => sel.id === c.id) &&
              hueKeysInUse.has(getHueGroupKey(c.color))
          );

        if (replacement) {
          const weakerIndex = bestComboWithSmartShades.findIndex(
            (c) => c.id === weaker.id
          );
          if (weakerIndex !== -1) {
            bestComboWithSmartShades[weakerIndex] = replacement;
          }
        }
      }
    }
  }

  // Step 4.7: If bestComboWithSmartShades does not have 3 colors, add the least boring color
  if (bestComboWithSmartShades.length < 3) {
    // Use special minCount for leastBoringColor case
    const lbcMinCount = specialPokemonCases[pokemonId]?.type === "leastBoringColor"
      ? specialPokemonCases[pokemonId].value
      : 25;

    const leastBoringColor = colorListWithIds.slice(0, 6).reduce(
      (lbc, c) => {
        const hslA = RGBToHSL(lbc.color);
        const hslB = RGBToHSL(c.color);
        const isAlreadyIncluded = bestComboWithSmartShades.some(
          (ss) => {
            const hslSS = RGBToHSL(ss.color);
            return hslSS.h === hslB.h && hslSS.s === hslB.s && hslSS.l === hslB.l;
          }
        );
        if (hslB.s > hslA.s && !isAlreadyIncluded && c.count > lbcMinCount) {
          return c;
        }
        return lbc;
      },
      { color: [0, 0, 0], count: 0 }
    );
    if (leastBoringColor.count > 0) {
      bestComboWithSmartShades.push(leastBoringColor);
    }
  }

  // Step 5: Deduplicate selected shades (by ID)
  const uniqueSelected = [];
  const seenIds = new Set();
  for (const c of bestComboWithSmartShades) {
    if (!seenIds.has(c.id)) {
      uniqueSelected.push(c);
      seenIds.add(c.id);
    }
  }

  // Step 6: Return selected + remaining
  const remaining = colorListWithIds.filter((c) => !seenIds.has(c.id));

  let finalTop = [...uniqueSelected];
  let finalRest = [...remaining];

  while (finalTop.length < pickCount && finalRest.length > 0) {
    finalTop.push(finalRest.shift());
  }

  // Find brightness-similar pairs in the top 3
  for (let i = 0; i < Math.min(pickCount, finalTop.length); i++) {
    for (let j = i + 1; j < Math.min(pickCount, finalTop.length); j++) {
      const a = finalTop[i];
      const b = finalTop[j];

      const sumA = a.color.reduce((x, y) => x + y, 0);
      const sumB = b.color.reduce((x, y) => x + y, 0);
      const brightnessDiff = Math.abs(sumA - sumB);

      const sameHueGroup = getHueGroupKey(a.color) === getHueGroupKey(b.color);
      const oneIsNotLowSaturated =
        RGBToHSL(a.color).s * 100 > 30 && RGBToHSL(b.color).s * 100 > 30;
      
      if (brightnessDiff <= 10 && sameHueGroup && oneIsNotLowSaturated) {
        const weaker = a.count < b.count ? a : b;
        const weakerIndex = finalTop.findIndex((c) => c.id === weaker.id);

        const replacementIndex = finalRest.findIndex(
          (c) => !finalTop.some((sel) => sel.id === c.id)
        );

        if (replacementIndex !== -1) {
          const replacement = finalRest[replacementIndex];

          finalTop[weakerIndex] = replacement;
          finalRest.splice(replacementIndex, 1);
          finalRest.push(weaker);
          break;
        }
      }
    }
  }

  return [...finalTop, ...finalRest.sort((a, b) => b.count - a.count)];
}

// ============================================================================
// MAIN EXTRACTION FUNCTION
// ============================================================================

/**
 * Extract color palette from an image buffer
 * @param {Buffer} imageBuffer - The image buffer
 * @param {Object} options - Options
 * @param {number} options.pokemonId - Pokemon ID for special case handling
 * @param {number} options.numColors - Number of colors for clustering (default: 16)
 * @param {number} options.topColors - Number of top colors to return (default: 6)
 */
async function extractColorPaletteFromImage(imageBuffer, options = {}) {
  const { numColors = 16, topColors = 6, pokemonId = null } = options;
  
  let sharp;
  try {
    sharp = require('sharp');
  } catch (e) {
    throw new Error(
      'This script requires the "sharp" package for image processing.\n' +
      'Install it with: npm install sharp'
    );
  }
  
  const { data, info } = await sharp(imageBuffer)
    .raw()
    .ensureAlpha()
    .toBuffer({ resolveWithObject: true });
  
  // Step 1: Extract colors (sorted by frequency) - matches webapp
  const sortedColors = extractColorsFromPixels(data, info.width, info.height);
  
  // Step 2: Get unique colors using the algorithm (matching webapp)
  // If >25 colors, webapp skips getMostUniqueColors for performance
  // But for backend script, we always use the full algorithm for accuracy
  const uniquelySortedColors = getMostUniqueColors(sortedColors, pokemonId, topColors);
  
  // Step 3: Get top 3 and order by luminance (matching webapp exactly)
  // The webapp calls orderByLuminance only on the top 3, not all colors
  const colorsByLuminance = uniquelySortedColors.slice(0, 3);
  orderByLuminance(colorsByLuminance);
  
  // Step 4: Combine: top 3 ordered by luminance + rest in algorithm order
  const finalColors = [...colorsByLuminance, ...uniquelySortedColors.slice(3)];
  
  // Return ALL colors in the proper order
  const palette = finalColors.map((c, index) => ({
    rank: index + 1,
    rgb: c.color,
    hex: c.hex || rgbToHex(...c.color),
    count: c.count
  }));
  
  // Primary colors are the top 3 (already ordered by luminance)
  const primaryPalette = palette.slice(0, 3).map(c => ({
    color: c.rgb.map(String),
    hex: c.hex,
    count: c.count
  }));
  
  return {
    // All colors in algorithmic order
    palette,
    // Primary 3 colors (the main ones to display)
    primaryColors: primaryPalette,
    // Just hex values for all colors
    hexColors: palette.map(c => c.hex),
    // Just RGB arrays for all colors
    rgbColors: palette.map(c => c.rgb),
    // Image dimensions
    dimensions: { width: info.width, height: info.height }
  };
}

/**
 * Process a single Pokemon (normal or shiny)
 */
async function processPokemon(pokemon, options = {}) {
  const { verbose = false, downloadDir = null } = options;
  const isShiny = pokemon.isShiny || false;
  
  try {
    if (verbose) {
      const shinyLabel = isShiny ? ' [SHINY]' : '';
      console.log(`  Fetching image from ${pokemon.source}${shinyLabel}: ${pokemon.url}`);
    }
    
    // Get fallback URLs in case primary fails (pass isShiny flag)
    const fallbackUrls = getFallbackUrls(pokemon.id, pokemon.name, isShiny);
    
    // Filter out the primary URL from fallbacks to avoid duplicates
    const uniqueFallbacks = fallbackUrls.filter(url => url !== pokemon.url);
    
    // Fetch with fallback support
    const { buffer: imageBuffer, usedUrl, wasFallback } = await fetchImageWithFallback(
      pokemon.url, 
      uniqueFallbacks
    );
    
    if (verbose && wasFallback) {
      console.log(`    Fallback used: ${usedUrl}`);
    }
    
    // Save image to local file if download directory is specified (cropped first)
    let localPath = null;
    if (downloadDir) {
      localPath = getLocalImagePath(downloadDir, pokemon.name, pokemon.id, isShiny);
      const bufferToSave = await cropWhitespace(imageBuffer);
      await saveImageToFile(bufferToSave, localPath);
      if (verbose) {
        console.log(`    Saved to: ${localPath}`);
      }
    }
    
    // Pass pokemonId for special case handling
    const palette = await extractColorPaletteFromImage(imageBuffer, {
      pokemonId: pokemon.id
    });
    
    // Check if this Pokemon has special handling
    const hasSpecialCase = !!specialPokemonCases[pokemon.id];
    
    return {
      id: pokemon.id,
      name: pokemon.name,
      isShiny,
      source: wasFallback ? 'fallback' : pokemon.source,
      url: usedUrl,
      originalUrl: wasFallback ? pokemon.url : undefined,
      usedFallback: wasFallback,
      localPath,
      specialCase: hasSpecialCase ? specialPokemonCases[pokemon.id].type : null,
      ...palette,
      success: true
    };
  } catch (error) {
    return {
      id: pokemon.id,
      name: pokemon.name,
      isShiny,
      source: pokemon.source,
      url: pokemon.url,
      error: error.message,
      success: false
    };
  }
}

/**
 * Process all Pokemon with rate limiting
 * @param {Object} options - Processing options
 * @param {number} options.start - Start Pokemon ID (default: 1)
 * @param {number} options.end - End Pokemon ID (default: all)
 * @param {string} options.pokemonName - Process single Pokemon by name
 * @param {boolean} options.includeShiny - Include shiny variants (default: true)
 * @param {boolean} options.shinyOnly - Process only shiny variants (default: false)
 * @param {number} options.concurrency - Number of concurrent requests (default: 5)
 * @param {boolean} options.verbose - Show detailed progress
 * @param {string} options.downloadDir - Directory to save images to (optional)
 */
async function processAllPokemon(options = {}) {
  const { 
    start = 1, 
    end = Infinity, 
    pokemonName = null,
    includeShiny = true,
    shinyOnly = false,
    concurrency = 5,
    verbose = false,
    downloadDir = null,
    onProgress = null
  } = options;
  
  // Get all Pokemon (with or without shiny variants)
  let pokemonList = getAllPokemon({ includeShiny });
  
  // Filter by shiny only if requested
  if (shinyOnly) {
    pokemonList = pokemonList.filter(p => p.isShiny);
  }
  
  // Filter by specific Pokemon name
  if (pokemonName) {
    pokemonList = pokemonList.filter(p => p.name === pokemonName);
    if (pokemonList.length === 0) {
      throw new Error(`Pokemon not found: ${pokemonName}`);
    }
  } else {
    // Filter by ID range
    pokemonList = pokemonList.filter(p => p.id >= start && p.id <= end);
  }
  
  const normalCount = pokemonList.filter(p => !p.isShiny).length;
  const shinyCount = pokemonList.filter(p => p.isShiny).length;
  console.log(`Processing ${pokemonList.length} Pokemon (${normalCount} normal, ${shinyCount} shiny)...`);
  
  const results = [];
  let processed = 0;
  
  // Process in batches for rate limiting
  for (let i = 0; i < pokemonList.length; i += concurrency) {
    const batch = pokemonList.slice(i, i + concurrency);
    
    const batchResults = await Promise.all(
      batch.map(pokemon => processPokemon(pokemon, { verbose, downloadDir }))
    );
    
    results.push(...batchResults);
    processed += batch.length;
    
    if (onProgress) {
      onProgress(processed, pokemonList.length);
    } else {
      const successful = batchResults.filter(r => r.success).length;
      const failed = batchResults.filter(r => !r.success).length;
      console.log(`  [${processed}/${pokemonList.length}] Processed batch: ${successful} success, ${failed} failed`);
    }
    
    // Small delay between batches to avoid rate limiting
    if (i + concurrency < pokemonList.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

function parseArgs(args) {
  const options = {};
  
  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      options[key] = value === undefined ? true : value;
    }
  }
  
  return options;
}

async function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);
  
  if (options.help) {
    console.log(`
Pokemon Color Palette Extractor

Usage:
  node extractColorPalette.js [options]

Options:
  --start=N        Start from Pokemon ID N (default: 1)
  --end=N          End at Pokemon ID N (default: all)
  --pokemon=NAME   Process single Pokemon by name
  --output=FILE    Save results to JSON file
  --download=DIR   Download images to specified directory
  --concurrency=N  Number of concurrent requests (default: 5)
  --no-shiny       Exclude shiny variants (by default, both normal and shiny are processed)
  --shiny-only     Process only shiny variants
  --verbose        Show detailed progress
  --debug          Show debug output for URL selection (for forms with ID >= 10000)
  --test           Run a quick test of URL selection logic for key Pokemon
  --za-megas       Use local ZA mega sprites from src/app/sprites/ (IDs 10278-10325)
  --help           Show this help message

Examples:
  node extractColorPalette.js                           # Process all Pokemon (normal + shiny)
  node extractColorPalette.js --start=1 --end=151       # Gen 1 only (normal + shiny)
  node extractColorPalette.js --pokemon=pikachu         # Single Pokemon (normal + shiny)
  node extractColorPalette.js --no-shiny                # Normal only, no shinies
  node extractColorPalette.js --shiny-only              # Shiny only
  node extractColorPalette.js --za-megas                # ZA megas from local sprites only
  node extractColorPalette.js --output=palettes.json    # Save to file
  node extractColorPalette.js --download=./sprites      # Download images to ./sprites folder
  node extractColorPalette.js --test                    # Test URL selection logic
`);
    process.exit(0);
  }
  
  // Enable debug output if requested
  if (options.debug) {
    DEBUG_URL_SELECTION = true;
  }
  
  // Quick test mode - verify URL selection logic for specific Pokemon
  if (options.test) {
    console.log('\n=== Testing URL Selection Logic ===\n');
    
    const testCases = [
      { name: 'bulbasaur', id: 1 },
      { name: 'deoxys', id: 386 },
      { name: 'deoxys-attack', id: 10001 },
      { name: 'deoxys-defense', id: 10002 },
      { name: 'rotom-heat', id: 10008 },
      { name: 'giratina-origin', id: 10007 },
      { name: 'tornadus-therian', id: 10019 },
      { name: 'kyurem-black', id: 10022 },
      { name: 'venusaur-mega', id: 10033 },
      { name: 'charizard-mega-x', id: 10034 },
    ];
    
    console.log('Normal sprites:');
    for (const tc of testCases) {
      const baseId = getBaseSpeciesId(tc.name, tc.id);
      const result = getPokemonSpriteURL(tc.name, tc.id);
      console.log(`  ${tc.name} (ID: ${tc.id}, baseID: ${baseId}): ${result.source}`);
      console.log(`    URL: ${result.url}`);
    }
    
    console.log('\nShiny sprites:');
    for (const tc of testCases) {
      const baseId = getBaseSpeciesId(tc.name, tc.id);
      const result = getShinyPokemonSpriteURL(tc.name, tc.id);
      console.log(`  ${tc.name} (ID: ${tc.id}, baseID: ${baseId}): ${result.source}`);
      console.log(`    URL: ${result.url}`);
    }
    
    console.log('\n=== Test Complete ===\n');
    process.exit(0);
  }
  
  // Handle shiny options
  const includeShiny = !options['no-shiny'];
  const shinyOnly = options['shiny-only'] || false;
  
  // Handle download directory
  const downloadDir = options.download || null;
  if (downloadDir) {
    console.log(`Images will be saved to: ${path.resolve(downloadDir)}`);
  }

  // ZA megas: use local sprites from src/app/sprites/, skip PokeAPI/PokeRogue
  const zaMegas = options['za-megas'] || false;

  try {
    const results = zaMegas
      ? await processAllPokemonZaMegas({
          includeShiny,
          concurrency: options.concurrency ? parseInt(options.concurrency, 10) : 5,
          verbose: options.verbose,
        })
      : await processAllPokemon({
          start: options.start ? parseInt(options.start, 10) : 1,
          end: options.end ? parseInt(options.end, 10) : Infinity,
          pokemonName: options.pokemon,
          includeShiny,
          shinyOnly,
          concurrency: options.concurrency ? parseInt(options.concurrency, 10) : 5,
          verbose: options.verbose,
          downloadDir,
        });
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    const successfulNormal = successful.filter(r => !r.isShiny).length;
    const successfulShiny = successful.filter(r => r.isShiny).length;
    
    console.log(`\nCompleted: ${successful.length} success (${successfulNormal} normal, ${successfulShiny} shiny), ${failed.length} failed`);
    
    if (failed.length > 0) {
      console.log('\nFailed Pokemon:');
      failed.forEach(f => {
        const shinyLabel = f.isShiny ? ' [SHINY]' : '';
        console.log(`  - ${f.name}${shinyLabel} (${f.id}): ${f.error}`);
      });
    }
    
    // Output results
    if (options.output) {
      const outputPath = path.resolve(options.output);
      
      // Format for database insertion - includes ALL colors in algorithm order
      const dbFormat = successful.map(r => ({
        id: r.id,
        name: r.name,
        isShiny: r.isShiny,
        // All colors in algorithmic order (top 3 are "primary", rest follow)
        colors: r.palette.map(c => ({
          rgb: c.rgb,
          hex: c.hex,
          count: c.count
        })),
        // Convenience: just the hex values for all colors
        hexColors: r.hexColors,
        // Convenience: primary 3 colors (for backward compatibility)
        primaryColors: r.primaryColors,
        source: r.source,
        specialCase: r.specialCase
      }));
      
      fs.writeFileSync(outputPath, JSON.stringify(dbFormat, null, 2));
      console.log(`\nResults saved to: ${outputPath}`);
    } else {
      // Print sample results to console
      console.log('\nSample results:');
      successful.slice(0, 6).forEach(r => {
        const shinyLabel = r.isShiny ? ' [SHINY]' : '';
        console.log(`\n${r.name}${shinyLabel} (#${r.id}) [${r.source}]${r.specialCase ? ` (${r.specialCase})` : ''}:`);
        console.log('  All colors (in algorithm order):');
        r.palette.forEach((c, i) => {
          const isPrimary = i < 3 ? ' *' : '';
          console.log(`    ${i + 1}. ${c.hex} - RGB(${c.rgb.join(', ')}) - ${c.count} pixels${isPrimary}`);
        });
      });
      
      if (successful.length > 6) {
        console.log(`\n... and ${successful.length - 6} more. Use --output=file.json to save all results.`);
      }
      console.log('\n  (* = primary colors, first 3)');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run CLI if this file is executed directly
if (require.main === module) {
  main();
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Main functions
  processAllPokemon,
  processAllPokemonZaMegas,
  processPokemon,
  extractColorPaletteFromImage,
  
  // Pokemon data functions
  getAllPokemon,
  getPokemonSpriteURL,
  getShinyPokemonSpriteURL,
  getPokeApiUrl,
  getPokeApiShinyUrl,
  getPokeRogueUrl,
  getPokeRogueShinyUrl,
  getFallbackUrls,
  hasFormSpecificSprite,
  isFormWithSharedId,
  getBasePokemonName,
  getFormSuffix,
  extractBaseIdFromAnimationKey,
  getBaseSpeciesId,
  shouldUsePokeApi,
  
  // Image fetching (with fallback support)
  fetchImage,
  fetchImageWithFallback,

  // Filename utilities
  getFilename,
  
  // Special cases map (for reference/modification)
  specialPokemonCases,
  
  // Color utilities
  extractColorsFromPixels,
  medianCutQuantize,
  orderByLuminance,
  getMostUniqueColors,
  RGBtoHSV,
  RGBToHSL,
  rgbToHex
};
