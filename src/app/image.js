export const cropWhitespace = (image) => {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")

    canvas.width = image.width
    canvas.height = image.height
    if (
      image instanceof HTMLImageElement ||
      image instanceof HTMLCanvasElement ||
      image instanceof ImageBitmap
    ) {
      ctx.drawImage(image, 0, 0)
    } else {
      return resolve(null)
    }

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const pixels = imageData.data

    let top = 0,
      bottom = canvas.height - 1,
      left = 0,
      right = canvas.width - 1
    let foundContent = false

    function isTransparent(a) {
      return a === 0
    }

    // Top bound
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const i = (y * canvas.width + x) * 4
        if (!isTransparent(pixels[i + 3])) {
          top = y
          foundContent = true
          break
        }
      }
      if (foundContent) break
    }

    // Bottom bound
    foundContent = false
    for (let y = canvas.height - 1; y >= 0; y--) {
      for (let x = 0; x < canvas.width; x++) {
        const i = (y * canvas.width + x) * 4
        if (!isTransparent(pixels[i + 3])) {
          bottom = y + 1
          foundContent = true
          break
        }
      }
      if (foundContent) break
    }

    // Left bound
    foundContent = false
    for (let x = 0; x < canvas.width; x++) {
      for (let y = 0; y < canvas.height; y++) {
        const i = (y * canvas.width + x) * 4
        if (!isTransparent(pixels[i + 3])) {
          left = x
          foundContent = true
          break
        }
      }
      if (foundContent) break
    }

    // Right bound
    foundContent = false
    for (let x = canvas.width - 1; x >= 0; x--) {
      for (let y = 0; y < canvas.height; y++) {
        const i = (y * canvas.width + x) * 4
        if (!isTransparent(pixels[i + 3])) {
          right = x + 1
          foundContent = true
          break
        }
      }
      if (foundContent) break
    }

    const croppedWidth = Math.min(right, canvas.width) - left
    const croppedHeight = Math.min(bottom, canvas.height) - top

    if (croppedWidth <= 0 || croppedHeight <= 0) {
      resolve(null)
      return
    }

    let finalWidth = croppedWidth
    let finalHeight = croppedHeight
    let paddingTop = 0

    const targetAspectRatio = 1.66
    const currentAspectRatio = croppedWidth / croppedHeight

    if (currentAspectRatio > targetAspectRatio) {
      finalHeight = Math.round(croppedWidth / 1.3)
      paddingTop = Math.floor((finalHeight - croppedHeight) / 2)
    }

    const resultCanvas = document.createElement("canvas")
    const resultCtx = resultCanvas.getContext("2d")

    resultCanvas.width = finalWidth
    resultCanvas.height = finalHeight

    // Fill with transparent pixels
    resultCtx.clearRect(0, 0, finalWidth, finalHeight)

    // Draw original cropped content centered vertically
    resultCtx.drawImage(
      canvas,
      left,
      top,
      croppedWidth,
      croppedHeight,
      0,
      paddingTop,
      croppedWidth,
      croppedHeight
    )

    resolve(resultCanvas.toDataURL())
  })
}

export const cropToSquareRatio = (image) => {
  return new Promise((resolve) => {
    // Step 1: Draw original image
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    canvas.width = image.width
    canvas.height = image.height
    ctx.drawImage(image, 0, 0)

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data

    let top = canvas.height,
      bottom = 0,
      left = canvas.width,
      right = 0
    let found = false

    // Step 2: Find bounds with visible pixels
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const i = (y * canvas.width + x) * 4
        const alpha = data[i + 3]
        if (alpha > 0) {
          found = true
          if (x < left) left = x
          if (x > right) right = x
          if (y < top) top = y
          if (y > bottom) bottom = y
        }
      }
    }

    if (!found) return resolve(null) // Fully transparent

    const cropW = right - left + 1
    const cropH = bottom - top + 1

    // Step 3: Create cropped image
    const croppedCanvas = document.createElement("canvas")
    croppedCanvas.width = cropW
    croppedCanvas.height = cropH
    const croppedCtx = croppedCanvas.getContext("2d")
    croppedCtx.imageSmoothingEnabled = false
    croppedCtx.drawImage(canvas, left, top, cropW, cropH, 0, 0, cropW, cropH)

    // Step 4: Create square canvas with padding
    const size = Math.max(cropW, cropH)
    const finalCanvas = document.createElement("canvas")
    finalCanvas.width = size
    finalCanvas.height = size
    const finalCtx = finalCanvas.getContext("2d")
    finalCtx.imageSmoothingEnabled = false
    finalCtx.clearRect(0, 0, size, size)

    const offsetX = Math.floor((size - cropW) / 2)
    const offsetY = Math.floor((size - cropH) / 2)

    finalCtx.drawImage(croppedCanvas, offsetX, offsetY)

    resolve(finalCanvas.toDataURL())
  })
}
