"use client"
import { useEffect, useRef } from "react"
import positioned from "../positioned.json"
import { useRouter } from "next/navigation"
import speciesData from "../species.json"
import { queryableNameToPokemonName } from "../utils"
import { getContrastingBaseTextColor } from "../color"
import PokeballAndLogo from "../components/PokeballAndLogo"
import SettingsMenu from "../components/SettingsMenu"
import styles from "./styles.module.css"
import Footer from "../components/Footer"

interface IPokemonSprite {
  data: {
    id: string;
    name: string;
    colorHex: string;
    allColors: string[];
    width: number;
    height: number;
    filename: string;
  };
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function AtlasPageClient() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageCacheRef = useRef<Record<string, HTMLImageElement>>({});
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
  const router = useRouter();

  // Helper to load an image (returns a promise)
  function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = src;
      img.onload = () => resolve(img);
      img.onerror = reject;
    });
  }

  async function drawAll(
    offsetX: number,
    offsetY: number
  ) {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")!
    const imageCache: Record<string, HTMLImageElement> = {};
    const pokemonList = positioned;
  
    // Clear the canvas first
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  
    ctx.save(); // Save current state
    ctx.translate(offsetX, offsetY); // Apply pan offset
  
    for (const p of pokemonList) {
      if (!imageCache[p.data.name]) {
        imageCache[p.data.name] = await loadImage(`/sprites/normal/${p.data.filename}`);
      }
  
      ctx.drawImage(
        imageCache[p.data.name],
        p.x,
        p.y,
        p.width,
        p.height
      );
    }
  
    ctx.restore(); // Restore state so translation doesn't accumulate
  }

  useEffect(() => {
    async function preloadImages() {
      const cache: Record<string, HTMLImageElement> = {};
      
      // Load background image
      const bgImg = await loadImage('/blurredColors.png');
      backgroundImageRef.current = bgImg;
      
      await Promise.all(
        positioned.map(async (p) => {
          if (!cache[p.data.name ?? '']) {
            const img = await loadImage(`/spritesForAtlas/normal/${p.data.filename}`);
            cache[p.data.name ?? ''] = img;
          }
        })
      );
      imageCacheRef.current = cache;

      drawAll(0, 0); // initial draw after all images loaded
    }

    preloadImages();
  }, []);

  function hitTest(
    p: IPokemonSprite,
    x: number,
    y: number
  ): boolean {
    return (
      x >= p.x &&
      x <= p.x + p.width &&
      y >= p.y &&
      y <= p.y + p.height
    )
  }

  function findHovered(
    sprites: IPokemonSprite[],
    x: number,
    y: number
  ): IPokemonSprite | null {
    for (let i = sprites.length - 1; i >= 0; i--) {
      if (hitTest(sprites[i], x, y)) {
        return sprites[i]
      }
    }
    return null
  }

  function getCanvasMouse(
    e: MouseEvent,
    canvas: HTMLCanvasElement
  ) {
    const rect = canvas.getBoundingClientRect()
  
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }

  function drawTooltip(
    ctx: CanvasRenderingContext2D,
    p: IPokemonSprite,
    mouseX: number,
    mouseY: number
  ): void {
    const padding = 24
    const text = p.data.name.replaceAll("-", " ")
    const capitalizedText = text.split(" ").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")

    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0) // draw in canvas pixel space

    ctx.font = "36px Inconsolata, monospace, system-ui, sans-serif"
    ctx.textBaseline = "top"

    const swatchWidth = 250
    const textWidth = ctx.measureText(capitalizedText).width
    const boxWidth = Math.max(swatchWidth, textWidth) + padding * 2
    const boxHeight = 180 + padding * 2

    const x = mouseX + 30
    const y = mouseY + 10

    // background
    ctx.fillStyle = p.data.colorHex
    ctx.fillRect(x, y, boxWidth, boxHeight)

    // border
    ctx.strokeStyle = "rgba(255,255,255,0.15)"
    ctx.strokeRect(x, y, boxWidth, boxHeight)

    // text
    const textColor = getContrastingBaseTextColor(p.data.colorHex)
    ctx.fillStyle = textColor
    ctx.fillText(capitalizedText, x + padding, y + padding)

    // text
    ctx.fillStyle = textColor
    ctx.fillText("Swatch", x + padding, y + padding + 60)
    
    for (let i = 0; i < p.data.allColors.slice(0, 5).length; i++) {
      const color = p.data.allColors[i]
      ctx.fillStyle = color
      ctx.fillRect(x + padding + (i * 50), y + padding + 120, 50, 50)
      ctx.strokeStyle = textColor
      ctx.strokeRect(x + padding + (i * 50), y + padding + 120, 50, 50)
    }

    ctx.restore()
  }

  // function draw(
  //   ctx: CanvasRenderingContext2D,
  //   canvas: HTMLCanvasElement,
  //   sprites: IPokemonSprite[],
  //   view: IViewState,
  //   hovered: IPokemonSprite | null,
  //   mouseX: number,
  //   mouseY: number
  // ): void {
  //   ctx.clearRect(0, 0, canvas.width, canvas.height)
  
  //   ctx.save()
  //   ctx.translate(view.offsetX, view.offsetY)
  //   ctx.scale(view.scale, view.scale)
  
  //   for (const p of sprites) {
  //     const img = imageCacheRef.current[p.data.name ?? ''];
  //     ctx.drawImage(img, p.x, p.y, p.width, p.height)
  
  //     if (p === hovered) {
  //       ctx.strokeStyle = "rgba(255,255,255,0.4)"
  //       ctx.lineWidth = 1
  //       ctx.strokeRect(p.x, p.y, p.width, p.height)
  //     }
  //   }
  
  //   ctx.restore()
  
  //   if (hovered) {
  //     drawTooltip(ctx, hovered, mouseX, mouseY)
  //   }
  // }

  useEffect(() => {
    const canvas = document.createElement("canvas");
    canvasRef.current = canvas;
    const ctx = canvas.getContext("2d")!;
    canvas.id = "atlas";
    ctx.imageSmoothingEnabled = false;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Sprite bounds (world coords) for pan/zoom limits
    const PAD = 100;
    let boundsMinX = Infinity;
    let boundsMinY = Infinity;
    let boundsMaxX = -Infinity;
    let boundsMaxY = -Infinity;
    for (const p of positioned) {
      boundsMinX = Math.min(boundsMinX, p.x);
      boundsMinY = Math.min(boundsMinY, p.y);
      boundsMaxX = Math.max(boundsMaxX, p.x + p.width);
      boundsMaxY = Math.max(boundsMaxY, p.y + p.height);
    }
    const boundsWidth = boundsMaxX - boundsMinX;
    const boundsHeight = boundsMaxY - boundsMinY;

    function resizeCanvas() {
      const container = document.getElementById("atlas-page-client");
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const w = Math.floor(rect.width);
      const h = Math.floor(rect.height);
      if (w <= 0 || h <= 0) return;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.position = "absolute";
      canvas.style.top = "0";
      canvas.style.left = "0";
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    }
  
    let offsetX = 0;
    let offsetY = 0;
    let targetOffsetX = 0;
    let targetOffsetY = 0;
    let isPanning = false;
    let panStartOffsetX = 0;
    let panStartOffsetY = 0;
    let panStartClientX = 0;
    let panStartClientY = 0;
    const smoothing = 0.15;
    const panSensitivity = 1.5; // >1 = canvas moves further per pixel of mouse movement

    // Zoom variables (no min/max limits)
    let scale = 1;
    let targetScale = 1;
    let hasInitialZoom = false;

    // --- Mouse events for panning ---
    canvas.addEventListener("mousedown", (e) => {
      isPanning = true;
      panStartOffsetX = targetOffsetX;
      panStartOffsetY = targetOffsetY;
      panStartClientX = e.clientX;
      panStartClientY = e.clientY;
    });

    canvas.addEventListener("mousemove", (e) => {
      if (!isPanning) return;
      const viewW = canvas.width / dpr;
      const viewH = canvas.height / dpr;
      const minOX = viewW - (boundsMaxX + PAD) * targetScale;
      const maxOX = (PAD - boundsMinX) * targetScale;
      const minOY = viewH - (boundsMaxY + PAD) * targetScale;
      const maxOY = (PAD - boundsMinY) * targetScale;
      const rawX = panStartOffsetX + (e.clientX - panStartClientX) * panSensitivity;
      const rawY = panStartOffsetY + (e.clientY - panStartClientY) * panSensitivity;
      targetOffsetX = Math.max(minOX, Math.min(maxOX, rawX));
      targetOffsetY = Math.max(minOY, Math.min(maxOY, rawY));
    });
  
    canvas.addEventListener("mouseup", () => { isPanning = false; });
    canvas.addEventListener("mouseleave", () => { isPanning = false; });
  
    // --- Wheel for zooming ---
    canvas.addEventListener("wheel", (e) => {
      e.preventDefault();

      const zoomFactor = 0.02;
      const delta = -e.deltaY; // normalize trackpad scroll direction
      if (delta === 0) return;

      const viewW = canvas.width / dpr;
      const viewH = canvas.height / dpr;

      // Calculate min scale to ensure 100px padding above and below sprites
      const minScale = viewH / (boundsHeight + 2 * PAD);

      let newScale = targetScale + (delta > 0 ? zoomFactor : -zoomFactor);
      // Clamp scale to minScale (100px padding) and prevent <= 0
      if (newScale < minScale) newScale = minScale;
      if (newScale <= 0) return;

      // Zoom toward center of canvas (in client coords) so sprites stay centered when zooming out
      const rect = canvas.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const scaleRatio = newScale / targetScale;
      targetOffsetX = centerX - (centerX - targetOffsetX) * scaleRatio;
      targetOffsetY = centerY - (centerY - targetOffsetY) * scaleRatio;

      targetScale = newScale;
    });
  
    // --- Add canvas to DOM ---
    const container = document.getElementById("atlas-page-client");
    container?.appendChild(canvas);
    resizeCanvas();

    const resizeObserver = new ResizeObserver(() => resizeCanvas());
    if (container) resizeObserver.observe(container);

    // --- Draw function (apply both pan and zoom) ---
    function drawAll(
      offsetX: number,
      offsetY: number,
      scale: number,
      hovered: IPokemonSprite | null,
      mouseCanvasX: number,
      mouseCanvasY: number
    ) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);

      // Draw background image covering the sprite bounds area
      const bgImg = backgroundImageRef.current;
      if (bgImg) {
        ctx.drawImage(
          bgImg,
          boundsMinX,
          boundsMinY,
          boundsWidth,
          boundsHeight
        );
      }

      for (const p of positioned) {
        const img = imageCacheRef.current[p.data.name ?? ''];
        if (img) {
          ctx.drawImage(img, p.x, p.y, p.width, p.height);
        }
      }

      ctx.restore();

      // Draw tooltip in canvas pixel space (after restore so no transform)
      if (hovered) {
        drawTooltip(ctx, hovered, mouseCanvasX * dpr, mouseCanvasY * dpr);
      }
    }

    let hovered: IPokemonSprite | null = null;
    let mouseCanvasX = 0;
    let mouseCanvasY = 0;

    canvas.addEventListener("dblclick", (e: MouseEvent) => {
      if (hovered) {
        const pokemonName = queryableNameToPokemonName(hovered.data.name);
        if (!speciesData.hasOwnProperty(pokemonName)) {
          const pokemonBaseForm = pokemonName.split("-")[0];
          router.push(`/pokemon/${pokemonBaseForm}?form=${pokemonName}`);
        } else {
          router.push(`/pokemon/${pokemonName}`);
        }
      }
    });

    canvas.addEventListener("mousemove", (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseCanvasX = e.clientX - rect.left;
      mouseCanvasY = e.clientY - rect.top;

      // Convert canvas pixel to world (atlas) coords for hit test
      const worldX = (mouseCanvasX - offsetX) / scale;
      const worldY = (mouseCanvasY - offsetY) / scale;
      hovered = findHovered(positioned, worldX, worldY);
    });

    canvas.addEventListener("mouseleave", () => {
      hovered = null;
    });

    // --- Animation frame loop ---
    let animationFrameId: number;
    const animate = () => {
      const viewW = canvas.width / dpr;
      const viewH = canvas.height / dpr;
      // Limit zoom out so there's 100px above and below the sprites (vertical only)
      const minScale = viewH / (boundsHeight + 2 * PAD);

      // Start fully zoomed out (once we have canvas dimensions)
      if (!hasInitialZoom && viewW > 0 && viewH > 0) {
        hasInitialZoom = true;
        scale = minScale;
        targetScale = minScale;
        // Center the atlas in view
        targetOffsetX = (viewW - (boundsMinX + boundsMaxX) * minScale) / 2;
        targetOffsetY = (viewH - (boundsMinY + boundsMaxY) * minScale) / 2;
        offsetX = targetOffsetX;
        offsetY = targetOffsetY;
      }

      offsetX += (targetOffsetX - offsetX) * smoothing;
      offsetY += (targetOffsetY - offsetY) * smoothing;
      scale += (targetScale - scale) * smoothing;
      
      // Clamp scale to minScale (100px above and below sprites)
      if (scale < minScale) scale = minScale;
      if (targetScale < minScale) targetScale = minScale;
      if (scale <= 0) scale = 0.01;
      if (targetScale <= 0) targetScale = 0.01;

      // Clamp pan to 100px beyond sprite bounds (horizontal)
      const panMinX = viewW - (boundsMaxX + PAD) * scale;
      const panMaxX = (PAD - boundsMinX) * scale;
      offsetX = Math.max(panMinX, Math.min(panMaxX, offsetX));
      targetOffsetX = Math.max(panMinX, Math.min(panMaxX, targetOffsetX));
      
      // Clamp pan to 100px beyond sprite bounds (vertical)
      const panMinY = viewH - (boundsMaxY + PAD) * scale;
      const panMaxY = (PAD - boundsMinY) * scale;
      offsetY = Math.max(panMinY, Math.min(panMaxY, offsetY));
      targetOffsetY = Math.max(panMinY, Math.min(panMaxY, targetOffsetY));

      drawAll(offsetX, offsetY, scale, hovered, mouseCanvasX, mouseCanvasY);

      animationFrameId = requestAnimationFrame(animate);
    };
    animate();
  
    // --- Cleanup ---
    return () => {
      resizeObserver.disconnect();
      canvas.removeEventListener("mousedown", () => {});
      canvas.removeEventListener("mousemove", () => {});
      canvas.removeEventListener("mouseup", () => {});
      canvas.removeEventListener("mouseleave", () => {});
      canvas.removeEventListener("wheel", () => {});
      cancelAnimationFrame(animationFrameId);
      container?.removeChild(canvas);
    };
  }, []);
  
  const style: React.CSSProperties = {
    ["--color1" as any]: "#e54545",
    ["--color2" as any]: "#ce372f",
    ["--color3" as any]: "rgb(186, 43, 50)",
  }

  return (
    <div style={style}>
      <header style={{ display: "flex", alignItems: "center", width: "100%", justifyContent: "space-between" }}>
          <PokeballAndLogo />
          <SettingsMenu className={styles.settingsIcon} iconColor="black" />
        </header>
      <div
        id="atlas-page-client"
        style={{
          width: "100%",
          height: "calc(100vh - 100px)",
          minHeight: "calc(100vh - 100px)",
          position: "relative",
          overflow: "hidden",
        }}
      >
      </div>
      <Footer shouldCenter />
    </div>
  )
}