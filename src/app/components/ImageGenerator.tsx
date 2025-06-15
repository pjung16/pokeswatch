import React, { useRef } from "react"
import { getContrastingTextColor, hexToRgb } from "../color"
import { TColorData } from "../types"
import { isMobile } from "react-device-detect"

interface IProps {
  spriteUrl: string | undefined
  colors: TColorData[]
  pokemonName: string | undefined
  buttonColor: string
}

const ImageGenerator = ({
  spriteUrl,
  colors,
  pokemonName,
  buttonColor,
}: IProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const getProportionalDimensions = (
    canvasWidth: number,
    originalWidth: number,
    originalHeight: number,
    newHeight: number
  ) => {
    // Calculate proportional width
    const newWidth = (originalWidth / originalHeight) * newHeight

    // Calculate x position to center the image
    const xPosition = (canvasWidth - newWidth) / 2

    return { newWidth, xPosition }
  }

  const drawAndDownloadImage = () => {
    const canvas = canvasRef.current
    if (canvas && spriteUrl && colors.length && pokemonName) {
      const ctx = canvas.getContext("2d")

      // Set canvas size
      const dpr = 4
      const width = isMobile ? 1179 : 1440
      const height = isMobile ? 2556 : 900
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`

      if (ctx) {
        ctx.scale(dpr, dpr)
        ctx.fillStyle = hexToRgb(colors[0].color, isMobile ? 0.8 : 0.75)
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }

      // Load image
      const img = new Image()
      img.src = spriteUrl // Replace with your image URL
      img.crossOrigin = "anonymous"
      img.onload = () => {
        // Background color
        const squareHeight1 = isMobile ? 864 : 204
        const squareHeight2 = isMobile ? 1568.5 : 623
        const startXPosition = isMobile ? 151 : 459
        const incrementX = isMobile ? 188 : 112
        const squareDimension = isMobile ? 124.5 : 74
        const imageYPosition = isMobile ? 1048.2 : 313.5
        const imageHeight = isMobile ? 463 : 275.5
        const { newWidth, xPosition } = getProportionalDimensions(
          width,
          img.width,
          img.height,
          imageHeight
        )

        if (ctx) {
          // Text on image
          ctx.fillStyle = colors[0].color
          ctx.fillRect(
            startXPosition,
            squareHeight1,
            squareDimension,
            squareDimension
          )

          ctx.fillStyle = colors[1].color
          ctx.fillRect(
            startXPosition + incrementX * 1,
            squareHeight1,
            squareDimension,
            squareDimension
          )

          ctx.fillStyle = colors[2].color
          ctx.fillRect(
            startXPosition + incrementX * 2,
            squareHeight1,
            squareDimension,
            squareDimension
          )

          ctx.fillStyle = colors[3].color
          ctx.fillRect(
            startXPosition + incrementX * 3,
            squareHeight1,
            squareDimension,
            squareDimension
          )

          ctx.fillStyle = colors[4].color
          ctx.fillRect(
            startXPosition + incrementX * 4,
            squareHeight1,
            squareDimension,
            squareDimension
          )

          ctx.fillStyle = colors[5].color
          ctx.fillRect(
            startXPosition,
            squareHeight2,
            squareDimension,
            squareDimension
          )

          ctx.fillStyle = colors[6].color
          ctx.fillRect(
            startXPosition + incrementX * 1,
            squareHeight2,
            squareDimension,
            squareDimension
          )

          ctx.fillStyle = colors[7].color
          ctx.fillRect(
            startXPosition + incrementX * 2,
            squareHeight2,
            squareDimension,
            squareDimension
          )

          ctx.fillStyle = colors[8].color
          ctx.fillRect(
            startXPosition + incrementX * 3,
            squareHeight2,
            squareDimension,
            squareDimension
          )

          ctx.fillStyle = colors[9].color
          ctx.fillRect(
            startXPosition + incrementX * 4,
            squareHeight2,
            squareDimension,
            squareDimension
          )

          ctx.imageSmoothingEnabled = false
          ctx.drawImage(img, xPosition, imageYPosition, newWidth, imageHeight) // Draw image on canvas

          setTimeout(() => {
            const image = canvas.toDataURL("image/png", 1.0) // High-quality PNG
            const link = document.createElement("a")
            link.href = image
            link.download = `${pokemonName}-${
              isMobile ? "mobile" : "desktop"
            }-background.png`
            link.click()
          }, 200) // Small delay to ensure image is drawn
        }
      }
    }
  }

  const drawAndDownloadMobileImage = () => {
    const canvas = canvasRef.current
    if (canvas && spriteUrl && colors.length && pokemonName) {
      const ctx = canvas.getContext("2d")

      // Set canvas size
      const dpr = 4
      const width = 1179
      const height = 2556
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`

      if (ctx) {
        ctx.scale(dpr, dpr)
        // ctx.fillStyle = hexToRgb(colors[0].color, 0.8)
        // ctx.fillRect(0, 0, canvas.width, canvas.height)
      }

      // Load image
      const img = new Image()
      img.src = spriteUrl // Replace with your image URL
      img.crossOrigin = "anonymous"
      img.onload = () => {
        // Background color
        const startXPosition = 0
        const incrementX = 393
        const stripeWidth = 393
        const imageYPosition = 1013
        const imageHeight = 531
        const { newWidth, xPosition } = getProportionalDimensions(
          width,
          img.width,
          img.height,
          imageHeight
        )

        if (ctx) {
          // Text on image
          ctx.fillStyle = colors[0].color
          ctx.fillRect(startXPosition, 0, stripeWidth, height)

          ctx.fillStyle = colors[1].color
          ctx.fillRect(startXPosition + incrementX * 1, 0, stripeWidth, height)

          ctx.fillStyle = colors[2].color
          ctx.fillRect(startXPosition + incrementX * 2, 0, stripeWidth, height)

          ctx.fillStyle = colors[2].color
          ctx.fillRect(startXPosition + incrementX * 2, 0, stripeWidth, height)

          ctx.fillStyle = "rgba(255,255,255,0.10)"
          ctx.fillRect(0, 0, canvas.width, canvas.height)

          ctx.imageSmoothingEnabled = false
          ctx.drawImage(img, xPosition, imageYPosition, newWidth, imageHeight) // Draw image on canvas

          setTimeout(() => {
            const image = canvas.toDataURL("image/png", 1.0) // High-quality PNG
            const link = document.createElement("a")
            link.href = image
            link.download = `${pokemonName}-mobile-background.png`
            link.click()
          }, 200) // Small delay to ensure image is drawn
        }
      }
    }
  }

  return (
    <div>
      <canvas ref={canvasRef} style={{ display: "none" }} />
      <button
        onClick={isMobile ? drawAndDownloadMobileImage : drawAndDownloadImage}
        style={{
          background: buttonColor,
          border: "none",
          fontFamily: "Inconsolata",
          cursor: "pointer",
          fontSize: "20px",
          marginTop: "12px",
          padding: "6px 20px",
          color: getContrastingTextColor(buttonColor),
          alignItems: "center",
          display: "flex",
        }}
      >
        Download {isMobile ? "Mobile" : "Desktop"} Background
      </button>
    </div>
  )
}

export default ImageGenerator
