import React, { useEffect, useRef } from "react"
import styles from "../pokemon/[pokemon]/styles.module.css"

// Frame shape shared by both formats
interface FrameData {
  filename: string
  frame: {
    x: number
    y: number
    w: number
    h: number
  }
  rotated: boolean
  trimmed: boolean
  spriteSourceSize: {
    x: number
    y: number
    w: number
    h: number
  }
  sourceSize: {
    w: number
    h: number
  }
  duration?: number
}

// Pokerogue format
interface TextureFormat {
  textures: {
    image: string
    format: string
    size: {
      w: number
      h: number
    }
    scale: number
    frames: FrameData[]
  }[]
  meta: {
    app: string
    version: string
    smartupdate: string
  }
}

// Aseprite format
interface AsepriteFormat {
  frames: FrameData[]
  meta: {
    app: string
    version: string
    image: string
    format: string
    size: {
      w: number
      h: number
    }
    scale: string
  }
}

// AnimationData can be either
export type AnimationData = TextureFormat | AsepriteFormat

interface PokemonSpriteAnimatorProps {
  spriteUrl: string
  animationData: AnimationData
  fallbackAnimation: string | undefined
  interval?: number // milliseconds between frames
  scale?: number // optional scaling factor
  style?: React.CSSProperties
  onClick?: () => void
}

// Helper function to extract frames regardless of format
function extractFrames(data: AnimationData): FrameData[] {
  if ("textures" in data) {
    return data.textures[0].frames
  } else {
    return data.frames
  }
}

export default function PokemonSpriteAnimator({
  spriteUrl,
  animationData,
  fallbackAnimation,
  interval = 100,
  scale = 1,
  style,
  onClick,
}: PokemonSpriteAnimatorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const firstSprite = extractFrames(animationData)[0]

  const canvasWidth = (firstSprite?.sourceSize.w ?? 64) * scale
  const canvasHeight = (firstSprite?.sourceSize.h ?? 64) * scale

  const finalWidth = canvasWidth
  let finalHeight = canvasHeight
  let paddingTop = 0

  const targetAspectRatio = 1.66
  const currentAspectRatio = canvasWidth / canvasHeight

  if (currentAspectRatio > targetAspectRatio) {
    finalHeight = Math.round(canvasWidth / 1.3)
    paddingTop = Math.floor((finalHeight - canvasHeight) / 2)
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !animationData) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.imageSmoothingEnabled = false

    const spriteImage = new Image()
    let animationId: number
    let frameIndex = 0
    let lastTime = 0
    let isCancelled = false

    const frames = [...extractFrames(animationData)].sort((a, b) => {
      const numA = parseInt(a.filename.replace(".png", ""), 10)
      const numB = parseInt(b.filename.replace(".png", ""), 10)
      return numA - numB
    })

    const draw = (timestamp: number) => {
      if (isCancelled) return
      if (!lastTime) lastTime = timestamp
      const elapsed = timestamp - lastTime

      if (elapsed > interval) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        const sprite = frames[frameIndex]
        const { frame } = sprite

        ctx.drawImage(
          spriteImage,
          frame.x,
          frame.y,
          frame.w,
          frame.h,
          0,
          (canvas.height - frame.h - paddingTop) * scale,
          frame.w * scale,
          frame.h * scale
        )

        frameIndex = (frameIndex + 1) % frames.length
        lastTime = timestamp
      }

      animationId = requestAnimationFrame(draw)
    }

    spriteImage.onload = () => {
      if (!isCancelled) {
        animationId = requestAnimationFrame(draw)
      }
    }

    spriteImage.src = spriteUrl

    return () => {
      isCancelled = true
      cancelAnimationFrame(animationId)
    }
  }, [spriteUrl, animationData, interval, scale, paddingTop])

  if (!animationData) {
    return (
      <img
        src={fallbackAnimation}
        className={styles.pokemonSprite}
        alt="pokemonSprite"
      />
    )
  }

  return (
    <canvas
      ref={canvasRef}
      width={finalWidth}
      height={finalHeight}
      className={styles.pokemonSprite}
      style={style}
      onClick={onClick}
    />
  )
}
