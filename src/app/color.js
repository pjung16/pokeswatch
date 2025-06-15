function RGBtoHSV(r, g, b) {
  if (arguments.length === 1) {
    g = r[1]
    b = r[2]
    r = r[0]
  }

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min

  let h = 0
  const s = max === 0 ? 0 : d / max
  const v = max / 255

  if (d !== 0) {
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
      default:
        break
    }
  }

  return { h, s, v }
}

/**
 * Using relative luminance we order the brightness of the colors
 * the fixed values and further explanation about this topic
 * can be found here -> https://en.wikipedia.org/wiki/Luma_(video)
 */
export const orderByLuminance = (colors) => {
  const sorted = colors.sort((p1, p2) => {
    const c1Low = p1.count < 17
    const c2Low = p2.count < 17

    if (c1Low && c2Low) return 0
    if (c1Low) return 1
    if (c2Low) return -1

    const hsv1 = RGBtoHSV(p1.color)
    const hsv2 = RGBtoHSV(p2.color)
    return hsv2.v + hsv2.s - (hsv1.v + hsv1.s)
  })

  // Step 1: If one color has much higher count, put it first, but only if it's a different shade from the
  // others and is not dark, or is not a boring color
  // was 1.58 (idk why)
  const dominant = sorted.find((c) =>
    sorted.every((other) => other === c || c.count >= 1.29 * other.count)
  )
  const doesDominantColorHaveSimilarShadeAndIsDark =
    !!dominant &&
    !!sorted.find((c) => {
      const hslA = RGBToHSL(c.color)
      const hslB = RGBToHSL(dominant.color)
      const hueDiff = Math.abs(hslA.h - hslB.h)
      return hslA.h !== hslB.h && hueDiff < 10 && hslB.l * 100 < 20
    })
  const isDominantColorBoring =
    !!dominant &&
    (() => {
      const hsl = RGBToHSL(dominant.color)
      return hsl.s * 100 < 5 || (hsl.s * 100 < 20 && hsl.l * 100 < 20)
    })()
  const isSuperDominant =
    !!dominant &&
    sorted.every(
      (other) => other === dominant || dominant.count >= 3 * other.count
    )
  if (
    isSuperDominant ||
    (!!dominant &&
      !doesDominantColorHaveSimilarShadeAndIsDark &&
      !isDominantColorBoring)
  ) {
    const index = sorted.indexOf(dominant)
    sorted.splice(index, 1)
    sorted.unshift(dominant)
  }

  // Step 2: Adjust if first color is too low in count
  if (
    sorted.length >= 3 &&
    sorted[0].count < 0.7 * sorted[1].count &&
    sorted[0].count < 0.7 * sorted[2].count
  ) {
    const [tooLow] = sorted.splice(0, 1)
    sorted.push(tooLow)

    // Re-sort new first two by luminance (v + s)
    sorted.splice(
      0,
      2,
      ...sorted.slice(0, 2).sort((a, b) => {
        const aHSV = RGBtoHSV(a.color)
        const bHSV = RGBtoHSV(b.color)
        return bHSV.v + bHSV.s - (aHSV.v + aHSV.s)
      })
    )
  }
}

export const getContrastingTextColor = (hexColor) => {
  // Remove '#' if present
  hexColor = hexColor.replace(/^#/, "")

  // Convert hex to RGB
  let r = parseInt(hexColor.substring(0, 2), 16)
  let g = parseInt(hexColor.substring(2, 4), 16)
  let b = parseInt(hexColor.substring(4, 6), 16)

  // Function to calculate relative luminance
  function relativeLuminance(channel) {
    channel /= 255
    return channel <= 0.03928
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4)
  }

  // Compute luminance
  let luminance =
    0.2126 * relativeLuminance(r) +
    0.7152 * relativeLuminance(g) +
    0.0722 * relativeLuminance(b)

  // Determine contrast color
  return luminance > 0.5 ? "black" : "white"
}

export const getContrastingBaseTextColor = (hexColor) => {
  // Remove '#' if present
  hexColor = hexColor.replace(/^#/, "")

  // Convert hex to RGB
  let r = parseInt(hexColor.substring(0, 2), 16)
  let g = parseInt(hexColor.substring(2, 4), 16)
  let b = parseInt(hexColor.substring(4, 6), 16)

  // Function to calculate relative luminance
  function relativeLuminance(channel) {
    channel /= 255
    return channel <= 0.03928
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4)
  }

  // Compute luminance
  let luminance =
    0.2126 * relativeLuminance(r) +
    0.7152 * relativeLuminance(g) +
    0.0722 * relativeLuminance(b)

  // Determine contrast color
  return luminance > 0.3 ? "black" : "white"
}

export const getContrastingBrightness = (hexColor) => {
  // Remove '#' if present
  hexColor = hexColor.replace(/^#/, "")

  // Convert hex to RGB
  let r = parseInt(hexColor.substring(0, 2), 16)
  let g = parseInt(hexColor.substring(2, 4), 16)
  let b = parseInt(hexColor.substring(4, 6), 16)

  // Function to calculate relative luminance
  function relativeLuminance(channel) {
    channel /= 255
    return channel <= 0.03928
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4)
  }

  // Compute luminance
  let luminance =
    0.2126 * relativeLuminance(r) +
    0.7152 * relativeLuminance(g) +
    0.0722 * relativeLuminance(b)

  // Determine contrast color
  return luminance > 0.5 ? "80%" : "120%"
}

export const hexToRgb = (hex, alpha = 1, background = [255, 255, 255]) => {
  // Remove "#" if present
  hex = hex.replace(/^#/, "")

  // Convert shorthand hex (e.g., #FC1 -> #FFCC11)
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((x) => x + x)
      .join("")
  }

  // Extract red, green, blue
  const bigint = parseInt(hex, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255

  // Ensure alpha is within 0-1 range
  alpha = Math.min(1, Math.max(0, alpha))

  // Apply alpha blending with background
  const newR = Math.round(r * alpha + background[0] * (1 - alpha))
  const newG = Math.round(g * alpha + background[1] * (1 - alpha))
  const newB = Math.round(b * alpha + background[2] * (1 - alpha))

  return `rgb(${newR}, ${newG}, ${newB})`
}

function hexToRGBHelper(hex) {
  hex = hex.replace(/^#/, "")
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((char) => char + char)
      .join("")
  }
  const num = parseInt(hex, 16)
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  }
}

export function hexToHSV(hex) {
  const { r, g, b } = hexToRGBHelper(hex)
  const rNorm = r / 255
  const gNorm = g / 255
  const bNorm = b / 255

  const max = Math.max(rNorm, gNorm, bNorm)
  const min = Math.min(rNorm, gNorm, bNorm)
  const delta = max - min

  let h = 0
  if (delta !== 0) {
    if (max === rNorm) {
      h = ((gNorm - bNorm) / delta) % 6
    } else if (max === gNorm) {
      h = (bNorm - rNorm) / delta + 2
    } else {
      h = (rNorm - gNorm) / delta + 4
    }
    h = Math.round(h * 60)
    if (h < 0) h += 360
  }

  const s = max === 0 ? 0 : delta / max
  const v = max

  return `hsv(${h}, ${Math.round(s * 100)}%, ${Math.round(v * 100)}%)`
}

export function hexToHSL(hex) {
  const { r, g, b } = hexToRGBHelper(hex)
  const { h, s, l } = RGBToHSL([r, g, b])
  return `hsl(${h}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`
}

function RGBToHSL([r, g, b]) {
  const rNorm = r / 255
  const gNorm = g / 255
  const bNorm = b / 255

  const max = Math.max(rNorm, gNorm, bNorm)
  const min = Math.min(rNorm, gNorm, bNorm)
  const delta = max - min

  let h = 0
  if (delta !== 0) {
    if (max === rNorm) {
      h = ((gNorm - bNorm) / delta) % 6
    } else if (max === gNorm) {
      h = (bNorm - rNorm) / delta + 2
    } else {
      h = (rNorm - gNorm) / delta + 4
    }
    h = Math.round(h * 60)
    if (h < 0) h += 360
  }

  const l = (max + min) / 2
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1))

  return {
    h,
    s,
    l,
  }
}

function hslDistance(rgb1, rgb2) {
  const { h: h1, s: s1, l: l1 } = RGBToHSL(rgb1)
  const { h: h2, s: s2, l: l2 } = RGBToHSL(rgb2)

  // Compute hue difference, normalized to [0, 1]
  let hueDiff = Math.abs(h1 - h2)
  hueDiff = Math.min(hueDiff, 360 - hueDiff) / 180

  // Normalize saturation and lightness differences to [0, 1]
  const sDiff = (s1 * 100 - s2 * 100) / 100
  const lDiff = (l1 * 100 - l2 * 100) / 100

  const avgSaturation = (s1 * 100 + s2 * 100) / 2 / 100
  const avgLightness = (l1 * 100 + l2 * 100) / 2 / 100
  const sSimilarity = 1 - Math.abs(s1 * 100 - s2 * 100) / 100
  const lSimilarity = 1 - Math.abs(l1 * 100 - l2 * 100) / 100

  // If both saturation and lightness are low AND similar, hue matters less
  const muteFactor =
    avgSaturation < 0.3 &&
    avgLightness < 0.3 &&
    sSimilarity > 0.8 &&
    lSimilarity > 0.8
      ? 0.5 // reduce hue impact
      : 2 // otherwise, emphasize hue

  const adjustedHue = hueDiff * muteFactor

  return Math.sqrt(adjustedHue ** 2 + sDiff ** 2 + lDiff ** 2)
}

// colorDistance: use HSL distance instead of color distance
// topNColors: change the number of colors for the topN algorithm
// mostFrequent: change the hueBinSize to include most frequent color
// leastBoringColor: change minimum count of the least boring color
// handPickedColors: custom colors for the pokemon
const specialPokemonCases = {
  // Iron Treads
  990: {
    type: "colorDistance",
  },
  // Lechonk
  915: {
    type: "colorDistance",
  },
  // Dragapult
  887: {
    type: "topNColors",
    value: 7,
  },
  // Swalot
  317: {
    type: "topNColors",
    value: 8,
  },
  // Mamoswine
  473: {
    type: "topNColors",
    value: 8,
  },
  // Musharna
  518: {
    type: "topNColors",
    value: 4,
  },
  // Cinccino
  573: {
    type: "topNColors",
    value: 5,
  },
  // Beedrill
  15: {
    type: "topNColors",
    value: 5,
  },
  // Frosmoth
  873: {
    type: "topNColors",
    value: 5,
  },
  // Starly
  396: {
    type: "topNColors",
    value: 4,
  },
  // Amoonguss
  591: {
    type: "topNColors",
    value: 4,
  },
  // Barraskewda
  847: {
    type: "topNColors",
    value: 4,
  },
  // Snubbull
  209: {
    type: "topNColors",
    value: 4,
  },
  // sharpedo
  319: {
    type: "topNColors",
    value: 7,
  },
  // Blastoise
  9: {
    type: "mostFrequent",
    value: 50,
  },
  // Yamask
  562: {
    type: "leastBoringColor",
    value: 23,
  },
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
}

function arraysAreEqual(arr1, arr2) {
  if (arr1.length !== arr2.length) {
    return false
  }
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) {
      return false
    }
  }
  return true
}

export function getMostUniqueColors(
  colorList,
  pokemonId,
  topN = 6,
  pickCount = 3,
  minCount = 17
) {
  const colorListWithIds = colorList.map((c, i) => ({
    ...c,
    id: c.id ?? i,
  }))

  if (specialPokemonCases[pokemonId]?.type === "handPickedColors") {
    const colors = specialPokemonCases[pokemonId].value
    const nonPickedColors = colorListWithIds.filter(
      (c) =>
        !colors.some((c2) => {
          return arraysAreEqual(c.color, c2)
        })
    )
    const pickedColors = colorListWithIds.filter((c) =>
      colors.some((c2) => {
        return arraysAreEqual(c.color, c2)
      })
    )
    return [...pickedColors, ...nonPickedColors]
  }

  const topColors = colorListWithIds
    .slice()
    .sort((a, b) => b.count - a.count)
    .slice(
      0,
      specialPokemonCases[pokemonId]?.type === "topNColors"
        ? specialPokemonCases[pokemonId].value
        : topN
    )
    .filter((c) => c.count >= minCount)

  const combinations = getCombinations(
    topColors,
    Math.min(pickCount, topColors.length)
  )

  let bestCombo = []
  let maxDistance = -Infinity

  for (const combo of combinations) {
    let totalDist = 0
    for (let i = 0; i < combo.length; i++) {
      for (let j = i + 1; j < combo.length; j++) {
        if (specialPokemonCases[pokemonId]?.type === "colorDistance") {
          totalDist += hslDistance(combo[i].color, combo[j].color)
        } else {
          totalDist += colorDistance(combo[i].color, combo[j].color)
        }
      }
    }
    if (totalDist > maxDistance) {
      maxDistance = totalDist
      bestCombo = combo
    }
  }

  // Step 3: Replace each with the brightest shade in its hue group
  let bestHueKeys = [...new Set(bestCombo.map((c) => getHueGroupKey(c.color)))]

  let loweredHueBinSize = false
  let hueBinSize = 35

  while (bestHueKeys.length < 3 && hueBinSize > 10) {
    hueBinSize -= 5
    bestHueKeys = [
      ...new Set(bestCombo.map((c) => getHueGroupKey(c.color, hueBinSize))),
    ]
    loweredHueBinSize = true
  }

  let bestComboWithSmartShades = bestHueKeys
    .map((hueKey) => {
      const sameHueColors = colorListWithIds.filter(
        (c) =>
          getHueGroupKey(c.color, loweredHueBinSize ? hueBinSize : 60) ===
          hueKey
      )
      const maxCount = Math.max(...sameHueColors.map((c) => c.count))
      const threshold = maxCount * 0.85
      const candidates = sameHueColors.filter((c) => c.count >= threshold)
      return candidates.reduce((brightest, c) => {
        const v1 = RGBtoHSV(c.color.map(Number)).v
        const v2 = RGBtoHSV(brightest.color.map(Number)).v
        return v1 > v2 ? c : brightest
      }, candidates[0])
    })
    .sort((a, b) => b.count - a.count)

  // Step 4: If the most frequent color is not in the 3, try replacing a similar hue
  const mostFrequent = colorListWithIds[0]
  const isIncluded = bestComboWithSmartShades.some(
    (c) => c.id === mostFrequent.id
  )

  if (!isIncluded) {
    const hueBinSize =
      specialPokemonCases[pokemonId]?.type === "mostFrequent"
        ? specialPokemonCases[pokemonId].value
        : 60
    const mfHue = getHueGroupKey(mostFrequent.color, hueBinSize)
    const matchIndex = bestComboWithSmartShades.findIndex(
      (c) => getHueGroupKey(c.color, hueBinSize) === mfHue
    )
    if (matchIndex !== -1) {
      bestComboWithSmartShades[matchIndex] = mostFrequent
    }
  }

  // Step 4.5: Replace very dark shades if brighter alternative exists with similar count
  // don't do it in special cases
  if (specialPokemonCases[pokemonId]?.type !== "colorDistance") {
    bestComboWithSmartShades = bestComboWithSmartShades.map(
      (current, i, arr) => {
        const currentSum = current.color.map(Number).reduce((a, b) => a + b, 0)

        // was 280, i don't know why i set it to 280, but for now 225 seems to work better
        // it was actually for raging bolt (no purple if it's set to 225)
        if (
          currentSum < 225 ||
          (RGBtoHSV(current.color).s < 0.1 && currentSum < 280)
        ) {
          const maxCount = current.count
          const thresholdUpper = maxCount * 1.3 // 30% window
          const thresholdLower = maxCount * 0.7 // 30% window

          const brighterCandidates = colorListWithIds.filter((c) => {
            const sum = c.color.map(Number).reduce((a, b) => a + b, 0)
            return (
              sum > currentSum &&
              c.count >= thresholdLower &&
              c.count <= thresholdUpper &&
              !arr.some(
                (other) =>
                  other.id !== current.id &&
                  getHueGroupKey(other.color) === getHueGroupKey(c.color)
              )
            )
          })

          // Choose the brightest among the valid candidates
          if (brighterCandidates.length > 0) {
            return brighterCandidates.reduce((brightest, c) => {
              const v1 = RGBtoHSV(c.color.map(Number)).v
              const v2 = RGBtoHSV(brightest.color.map(Number)).v
              return v1 > v2 ? c : brightest
            }, brighterCandidates[0])
          }
        }

        return current
      }
    )
  }

  // Step 4.6: Replace similar-brightness color (within 10) with most common remaining color
  for (let i = 0; i < bestComboWithSmartShades.length; i++) {
    for (let j = i + 1; j < bestComboWithSmartShades.length; j++) {
      const a = bestComboWithSmartShades[i]
      const b = bestComboWithSmartShades[j]

      const hslA = RGBToHSL(a.color)
      const hslB = RGBToHSL(b.color)
      const brightnessDiff = Math.abs(hslA.l * 100 - hslB.l * 100)
      const hueDiff = Math.abs(hslA.h - hslB.h)

      if (brightnessDiff <= 10 && hueDiff <= 10) {
        const weaker = a.count < b.count ? a : b
        const hueKeysInUse = new Set(
          bestComboWithSmartShades.map((c) => getHueGroupKey(c.color))
        )

        const replacement = colorListWithIds
          .slice(0, 6)
          .find(
            (c) =>
              !bestComboWithSmartShades.some((sel) => sel.id === c.id) &&
              hueKeysInUse.has(getHueGroupKey(c.color))
          )

        if (replacement) {
          const weakerIndex = bestComboWithSmartShades.findIndex(
            (c) => c.id === weaker.id
          )
          if (weakerIndex !== -1) {
            bestComboWithSmartShades[weakerIndex] = replacement
          }
        }
      }
    }
  }

  // Step 4.7: if bestComboWithSmartShades does not have 3 colors, add the least boring color from the top 6
  // into the list for more variety of colors with a certain count requirement
  if (bestComboWithSmartShades.length < 3) {
    const leastBoringColor = colorListWithIds.slice(0, 6).reduce(
      (lbc, c) => {
        const hslA = RGBToHSL(lbc.color)
        const hslB = RGBToHSL(c.color)
        const isAlreadyIncluded = bestComboWithSmartShades.some(
          (ss) =>
            RGBToHSL(ss.color).h === hslB.h &&
            RGBToHSL(ss.color).s === hslB.s &&
            RGBToHSL(ss.color).l === hslB.l
        )
        // 17 or 25 (baseline was nidoran m)
        // yamask is 23
        const minCount =
          specialPokemonCases[pokemonId]?.type === "leastBoringColor"
            ? specialPokemonCases[pokemonId].value
            : 25
        if (hslB.s > hslA.s && !isAlreadyIncluded && c.count > minCount) {
          lbc = c
        }
        return lbc
      },
      { color: [0, 0, 0], count: 0 }
    )
    bestComboWithSmartShades.push(leastBoringColor)
  }

  // Step 5: Deduplicate selected shades (by ID)
  const uniqueSelected = []
  const seenIds = new Set()
  for (const c of bestComboWithSmartShades) {
    if (!seenIds.has(c.id)) {
      uniqueSelected.push(c)
      seenIds.add(c.id)
    }
  }

  // Step 6: Return selected + remaining
  const remaining = colorListWithIds.filter((c) => !seenIds.has(c.id))

  let finalTop = [...uniqueSelected]
  let finalRest = [...remaining]

  while (finalTop.length < 3 && finalRest.length > 0) {
    finalTop.push(finalRest.shift())
  }

  // Find brightness-similar pairs in the top 3
  for (let i = 0; i < Math.min(pickCount, finalTop.length); i++) {
    for (let j = i + 1; j < Math.min(pickCount, finalTop.length); j++) {
      const a = finalTop[i]
      const b = finalTop[j]

      const sumA = a.color.map(Number).reduce((x, y) => x + y, 0)
      const sumB = b.color.map(Number).reduce((x, y) => x + y, 0)
      const brightnessDiff = Math.abs(sumA - sumB)

      const sameHueGroup = getHueGroupKey(a.color) === getHueGroupKey(b.color)
      const oneIsNotLowSaturated =
        RGBToHSL(a.color).s * 100 > 30 && RGBToHSL(b.color).s * 100 > 30
      if (brightnessDiff <= 10 && sameHueGroup && oneIsNotLowSaturated) {
        const weaker = a.count < b.count ? a : b
        const weakerIndex = finalTop.findIndex((c) => c.id === weaker.id)

        // const usedHues = new Set(finalTop.map(c => getHueGroupKey(c.color)))

        const replacementIndex = finalRest.findIndex(
          (c) => !finalTop.some((sel) => sel.id === c.id)
          // !usedHues.has(getHueGroupKey(c.color))
        )

        if (replacementIndex !== -1) {
          const replacement = finalRest[replacementIndex]

          // Replace the weaker one with the more frequent, hue-diverse candidate
          finalTop[weakerIndex] = replacement
          finalRest.splice(replacementIndex, 1)
          finalRest.push(weaker) // keep the replaced one in the rest
          break // exit after one swap
        }
      }
    }
  }

  return [...finalTop, ...finalRest.sort((a, b) => b.count - a.count)]
}

function getHueGroupKey(color, hueBinSize = 60) {
  const hsv = RGBtoHSV(color.map(Number))
  const hue = Math.round((hsv.h * 360) / hueBinSize) * hueBinSize
  return `hue-${hue}`
}

function colorDistance(c1, c2) {
  return Math.sqrt(
    Math.pow(c1[0] - c2[0], 2) +
      Math.pow(c1[1] - c2[1], 2) +
      Math.pow(c1[2] - c2[2], 2)
  )
}

function getCombinations(arr, k) {
  const results = []
  function helper(start, combo) {
    if (combo.length === k) {
      results.push(combo)
      return
    }
    for (let i = start; i < arr.length; i++) {
      helper(i + 1, combo.concat([arr[i]]))
    }
  }
  helper(0, [])
  return results
}
