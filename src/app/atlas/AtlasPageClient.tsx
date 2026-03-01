"use client"
import { useEffect, useRef, useState, useMemo, useCallback } from "react"
import positioned from "../positioned.json"
import { useRouter } from "next/navigation"
import speciesData from "../species.json"
import { queryableNameToPokemonName, getPokemonIcon } from "../utils"
import { getContrastingBaseTextColor } from "../color"
import PokeballAndLogo from "../components/PokeballAndLogo"
import SettingsMenu from "../components/SettingsMenu"
import styles from "./styles.module.css"
import Footer from "../components/Footer"
import AtlasPokemonInfoCard from "./AtlasPokemonInfoCard"
import { Autocomplete, TextField } from "@mui/material"

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

interface AtlasSearchOption {
  label: string;
  name: string;
  id: number;
}

export default function AtlasPageClient() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const atlasImageRef = useRef<HTMLImageElement | null>(null);
  const [selectedPokemon, setSelectedPokemon] = useState<IPokemonSprite | null>(null);
  const router = useRouter();
  const panToRef = useRef<((pokemon: IPokemonSprite) => void) | null>(null);
  const highlightedRef = useRef<IPokemonSprite | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");

  const atlasSearchOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: AtlasSearchOption[] = [];
    for (const p of positioned) {
      if (seen.has(p.data.name)) continue;
      seen.add(p.data.name);
      const baseName = p.data.name.split("-")[0];
      const dexId = (speciesData as Record<string, number>)[p.data.name]
        ?? (speciesData as Record<string, number>)[baseName]
        ?? 0;
      const displayName = p.data.name
        .replaceAll("-", " ")
        .split(" ")
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      options.push({ label: displayName, name: p.data.name, id: dexId });
    }
    return options.sort((a, b) => a.id - b.id || a.name.localeCompare(b.name));
  }, []);

  const handleSelectPokemon = useCallback((pokemonName: string) => {
    const pokemon = (positioned as IPokemonSprite[]).find(p => p.data.name === pokemonName);
    if (pokemon) {
      highlightedRef.current = pokemon;
      panToRef.current?.(pokemon);
      setSelectedPokemon(pokemon);
      const url = new URL(window.location.href);
      url.searchParams.set('pokemon', pokemon.data.name);
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  const handleClosePokemon = useCallback(() => {
    highlightedRef.current = null;
    setSelectedPokemon(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('pokemon');
    window.history.replaceState({}, '', url.toString());
  }, []);

  // Helper to load an image (returns a promise)
  function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = src;
      img.onload = () => resolve(img);
      img.onerror = reject;
    });
  }

  useEffect(() => {
    let isMounted = true;
    async function preloadAtlasImage() {
      const atlasImg = await loadImage("/pokemonAtlas.png");
      if (isMounted) {
        atlasImageRef.current = atlasImg;
      }
    }
    preloadAtlasImage();
    return () => {
      isMounted = false;
    };
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
    ctx.setTransform(1, 0, 0, 1, 0, 0) // draw in raw canvas pixel space

    ctx.font = "36px Inconsolata, monospace, system-ui, sans-serif"
    ctx.textBaseline = "top"

    const swatchWidth = 250
    const textWidth = ctx.measureText(capitalizedText).width
    const boxWidth = Math.max(swatchWidth, textWidth) + padding * 2
    const boxHeight = 180 + padding * 2

    // All coordinates here are in raw canvas pixels
    const cw = ctx.canvas.width
    const ch = ctx.canvas.height
    const margin = 20

    // Default: tooltip to the right and below cursor
    let x = mouseX + 30
    let y = mouseY + 10

    // Flip horizontally if overflowing right
    if (x + boxWidth > cw - margin) {
      x = mouseX - boxWidth - 30
    }
    // Flip vertically if overflowing bottom
    if (y + boxHeight > ch - margin) {
      y = mouseY - boxHeight - 10
    }

    // Final hard clamp
    x = Math.max(margin, Math.min(x, cw - boxWidth - margin))
    y = Math.max(margin, Math.min(y, ch - boxHeight - margin))

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
    let didMouseDrag = false;
    let didTouchDrag = false;
    let suppressNextClickFromTouch = false;
    let touchStartClientX: number | null = null;
    let touchStartClientY: number | null = null;
    const dragThresholdPx = 4;

    // --- Mouse events for panning ---
    canvas.addEventListener("mousedown", (e) => {
      isPanning = true;
      didMouseDrag = false;
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
      const movedX = e.clientX - panStartClientX;
      const movedY = e.clientY - panStartClientY;
      if (Math.hypot(movedX, movedY) > dragThresholdPx) {
        didMouseDrag = true;
      }
      const rawX = panStartOffsetX + (e.clientX - panStartClientX) * panSensitivity;
      const rawY = panStartOffsetY + (e.clientY - panStartClientY) * panSensitivity;
      targetOffsetX = Math.max(minOX, Math.min(maxOX, rawX));
      targetOffsetY = Math.max(minOY, Math.min(maxOY, rawY));
    });
  
    canvas.addEventListener("mouseup", () => { isPanning = false; });
    canvas.addEventListener("mouseleave", () => { isPanning = false; });

    // --- Touch events for panning and pinch-to-zoom ---
    let lastTouchDist = 0;

    canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        isPanning = true;
        didTouchDrag = false;
        panStartOffsetX = targetOffsetX;
        panStartOffsetY = targetOffsetY;
        panStartClientX = e.touches[0].clientX;
        panStartClientY = e.touches[0].clientY;
        touchStartClientX = e.touches[0].clientX;
        touchStartClientY = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        isPanning = false;
        didTouchDrag = true;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastTouchDist = Math.hypot(dx, dy);
      }
    }, { passive: false });

    canvas.addEventListener("touchmove", (e) => {
      e.preventDefault();
      if (e.touches.length === 1 && isPanning) {
        const viewW = canvas.width / dpr;
        const viewH = canvas.height / dpr;
        const minOX = viewW - (boundsMaxX + PAD) * targetScale;
        const maxOX = (PAD - boundsMinX) * targetScale;
        const minOY = viewH - (boundsMaxY + PAD) * targetScale;
        const maxOY = (PAD - boundsMinY) * targetScale;
        const movedX = e.touches[0].clientX - panStartClientX;
        const movedY = e.touches[0].clientY - panStartClientY;
        if (Math.hypot(movedX, movedY) > dragThresholdPx) {
          didTouchDrag = true;
        }
        const rawX = panStartOffsetX + (e.touches[0].clientX - panStartClientX) * panSensitivity;
        const rawY = panStartOffsetY + (e.touches[0].clientY - panStartClientY) * panSensitivity;
        targetOffsetX = Math.max(minOX, Math.min(maxOX, rawX));
        targetOffsetY = Math.max(minOY, Math.min(maxOY, rawY));
      } else if (e.touches.length === 2) {
        // Pinch-to-zoom
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        if (lastTouchDist > 0) {
          const viewH = canvas.height / dpr;
          const minScale = viewH / (boundsHeight + 2 * PAD);

          const scaleChange = (dist - lastTouchDist) * 0.005;
          let newScale = targetScale + scaleChange;
          if (newScale < minScale) newScale = minScale;
          if (newScale <= 0) return;

          // Zoom toward midpoint of the two fingers
          const rect = canvas.getBoundingClientRect();
          const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
          const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
          const scaleRatio = newScale / targetScale;
          targetOffsetX = midX - (midX - targetOffsetX) * scaleRatio;
          targetOffsetY = midY - (midY - targetOffsetY) * scaleRatio;

          targetScale = newScale;
        }
        lastTouchDist = dist;
      }
    }, { passive: false });

    canvas.addEventListener("touchend", (e) => {
      // Handle tap-to-select on touch, but ignore drag/pinch gestures.
      if (e.touches.length === 0 && !didTouchDrag) {
        const touch = e.changedTouches[0];
        const touchClientX = touch?.clientX ?? touchStartClientX;
        const touchClientY = touch?.clientY ?? touchStartClientY;
        if (touchClientX !== null && touchClientY !== null) {
          const rect = canvas.getBoundingClientRect();
          const touchCanvasX = touchClientX - rect.left;
          const touchCanvasY = touchClientY - rect.top;
          const worldX = (touchCanvasX - offsetX) / scale;
          const worldY = (touchCanvasY - offsetY) / scale;
          const tapped = findHovered(positioned, worldX, worldY);
          if (tapped) {
            highlightedRef.current = null;
            setSelectedPokemon(tapped);
            const url = new URL(window.location.href);
            url.searchParams.set('pokemon', tapped.data.name);
            window.history.replaceState({}, '', url.toString());
          }
        }
      }

      if (e.touches.length < 2) {
        lastTouchDist = 0;
      }
      if (e.touches.length === 0) {
        isPanning = false;
        touchStartClientX = null;
        touchStartClientY = null;
      }
      suppressNextClickFromTouch = true;
      didTouchDrag = false;
    });
  
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

      // Draw full atlas image instead of fetching individual sprites/background.
      const atlasImg = atlasImageRef.current;
      if (atlasImg) {
        // `pokemonAtlas.png` includes outer atlas padding, so align it to world bounds + PAD.
        const atlasWorldX = boundsMinX - PAD;
        const atlasWorldY = boundsMinY - PAD;
        const atlasWorldW = boundsWidth + PAD * 2;
        const atlasWorldH = boundsHeight + PAD * 2;
        ctx.drawImage(
          atlasImg,
          atlasWorldX,
          atlasWorldY,
          atlasWorldW,
          atlasWorldH
        );
      }

      ctx.restore();

      const hl = highlightedRef.current;
      if (hl) {
        ctx.save();
        ctx.scale(dpr, dpr);
        const screenX = hl.x * scale + offsetX;
        const screenY = hl.y * scale + offsetY;
        const screenW = hl.width * scale;
        const screenH = hl.height * scale;
        const pad = 6;
        const radius = 8;
        const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.005);

        ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
        ctx.shadowBlur = 10;
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.55 + 0.45 * pulse})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(screenX - pad, screenY - pad, screenW + pad * 2, screenH + pad * 2, radius);
        ctx.stroke();
        ctx.restore();
      }

      // Draw tooltip in raw canvas pixel space (after restore so no transform)
      if (hovered) {
        drawTooltip(ctx, hovered, mouseCanvasX * dpr, mouseCanvasY * dpr);
      }
    }

    let hovered: IPokemonSprite | null = null;
    let mouseCanvasX = 0;
    let mouseCanvasY = 0;

    const handleDoubleClick = () => {
      if (hovered) {
        const pokemonName = queryableNameToPokemonName(hovered.data.name);
        if (!speciesData.hasOwnProperty(pokemonName)) {
          const pokemonBaseForm = pokemonName.split("-")[0];
          router.push(`/pokemon/${pokemonBaseForm}?form=${pokemonName}`);
        } else {
          router.push(`/pokemon/${pokemonName}`);
        }
      }
    };
    canvas.addEventListener("dblclick", handleDoubleClick);

    const handleClick = () => {
      // Touch interactions synthesize a click event; ignore it.
      if (suppressNextClickFromTouch) {
        suppressNextClickFromTouch = false;
        return;
      }
      // Ignore click-select when the user dragged to pan.
      if (didMouseDrag) {
        didMouseDrag = false;
        return;
      }
      // Keep the current card open when clicking empty canvas.
      if (!hovered) return;
      highlightedRef.current = null;
      setSelectedPokemon(hovered);
      const url = new URL(window.location.href);
      url.searchParams.set('pokemon', hovered.data.name);
      window.history.replaceState({}, '', url.toString());
    };
    canvas.addEventListener("click", handleClick);

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

    panToRef.current = (pokemon: IPokemonSprite) => {
      const viewW = canvas.width / dpr;
      const viewH = canvas.height / dpr;
      const localMinScale = viewH / (boundsHeight + 2 * PAD);
      const pokeCenterX = pokemon.x + pokemon.width / 2;
      const pokeCenterY = pokemon.y + pokemon.height / 2;
      const desiredPxSize = Math.min(viewW, viewH) * 0.15;
      const pokeSize = Math.max(pokemon.width, pokemon.height);
      const newScale = Math.max(desiredPxSize / pokeSize, localMinScale);
      const infoCardSpace = viewW > 700 ? 186 : 0;
      targetScale = newScale;
      scale = newScale;
      targetOffsetX = (viewW / 2 - infoCardSpace) - pokeCenterX * newScale;
      offsetX = targetOffsetX;
      targetOffsetY = viewH / 2 - pokeCenterY * newScale;
      offsetY = targetOffsetY;
    };

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
        targetOffsetX = (viewW - (boundsMinX + boundsMaxX) * minScale) / 2;
        targetOffsetY = (viewH - (boundsMinY + boundsMaxY) * minScale) / 2;
        offsetX = targetOffsetX;
        offsetY = targetOffsetY;

        const urlParams = new URLSearchParams(window.location.search);
        const pokemonParam = urlParams.get('pokemon');
        if (pokemonParam) {
          const found = (positioned as IPokemonSprite[]).find(p => p.data.name === pokemonParam);
          if (found) {
            const pokeCenterX = found.x + found.width / 2;
            const pokeCenterY = found.y + found.height / 2;
            const desiredPxSize = Math.min(viewW, viewH) * 0.15;
            const pokeSize = Math.max(found.width, found.height);
            const zoomScale = Math.max(desiredPxSize / pokeSize, minScale);
            const infoCardSpace = viewW > 700 ? 186 : 0;
            targetScale = zoomScale;
            scale = zoomScale;
            targetOffsetX = (viewW / 2 - infoCardSpace) - pokeCenterX * zoomScale;
            targetOffsetY = viewH / 2 - pokeCenterY * zoomScale;
            offsetX = targetOffsetX;
            offsetY = targetOffsetY;
            highlightedRef.current = found;
            setSelectedPokemon(found);
          }
        }
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
      panToRef.current = null;
      resizeObserver.disconnect();
      canvas.removeEventListener("dblclick", handleDoubleClick);
      canvas.removeEventListener("click", handleClick);
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
        <div>
          <SettingsMenu className={styles.settingsIcon} iconColor="black" />
        </div>
      </header>
      <div
        id="atlas-page-client"
        style={{
          width: "100%",
          height: "calc(100vh - 100px)",
          minHeight: "calc(100vh - 100px)",
          position: "relative",
          overflow: "hidden",
          touchAction: "none",
        }}
      >
        <div className={styles.atlasSearchBar}>
          <Autocomplete
            open={searchOpen && searchInput.length > 0}
            onOpen={() => setSearchOpen(true)}
            onClose={() => setSearchOpen(false)}
            inputValue={searchInput}
            onInputChange={(_, value, reason) => {
              if (reason !== 'reset') {
                setSearchInput(value);
              }
            }}
            autoHighlight
            options={atlasSearchOptions}
            getOptionLabel={(option) => option.label}
            filterOptions={(options, state) => {
              const input = state.inputValue.toLowerCase();
              if (!input) return [];
              return options.filter(
                (option) =>
                  option.label.toLowerCase().includes(input) ||
                  option.name.toLowerCase().includes(input) ||
                  option.id.toString().includes(input)
              );
            }}
            onChange={(_, value) => {
              if (value) {
                handleSelectPokemon(value.name);
                setSearchInput("");
              }
            }}
            isOptionEqualToValue={(option, value) => option.name === value.name}
            noOptionsText="No Pokémon found"
            blurOnSelect
            slotProps={{
              paper: {
                sx: {
                  borderRadius: "0px 0px 16px 16px",
                  border: "1px solid rgba(0, 0, 0, 0.15)",
                  borderTopWidth: "0px",
                  boxShadow: "0 9px 8px -3px rgba(64, 60, 67, .24)",
                },
              },
              listbox: {
                sx: {
                  maxHeight: 300,
                  overflowY: "auto",
                },
              },
              popper: {
                modifiers: [{ name: "flip", enabled: false }],
                placement: "bottom-start" as const,
              },
            }}
            disablePortal
            sx={{
              width: "100%",
              "& fieldset": {
                borderRadius: searchOpen && searchInput ? "16px 16px 0px 0px" : "30px",
              },
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Search Pokémon..."
                size="small"
                sx={{
                  textTransform: "capitalize",
                  "& .MuiAutocomplete-input": { textTransform: "capitalize" },
                  "& .MuiOutlinedInput-root": {
                    borderRadius: searchOpen && searchInput ? "16px 16px 0px 0px" : "30px",
                    backgroundColor: "rgba(255, 255, 255, 0.92)",
                    backdropFilter: "blur(6px)",
                    boxShadow: "0px 2px 8px 2px rgba(64, 60, 67, .18)",
                  },
                  "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "rgba(0, 0, 0, 0.23)",
                  },
                  "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "rgba(0, 0, 0, 0.23)",
                    borderWidth: "1px",
                  },
                }}
              />
            )}
            renderOption={({ key, ...params }, option) => (
              <li key={key} {...params} style={{ textTransform: "capitalize" }}>
                <div
                  style={{
                    background: (() => {
                      const name = queryableNameToPokemonName(option.name);
                      const isBaseSpecies = (speciesData as Record<string, number>)[name] !== undefined;
                      return getPokemonIcon(isBaseSpecies ? name : name.replaceAll("-", ""));
                    })(),
                    width: "40px",
                    height: "30px",
                    imageRendering: "pixelated" as const,
                    transform: "scale(1.2)",
                    marginRight: "4px",
                  }}
                />
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  {option.id > 0 && (
                    <span style={{
                      fontSize: "12px",
                      color: "black",
                      border: "1px solid black",
                      padding: "0 6px",
                      borderRadius: "4px",
                      backgroundColor: "lightgrey",
                    }}>
                      #{option.id}
                    </span>
                  )}
                  <span>{option.label}</span>
                </div>
              </li>
            )}
          />
        </div>
        <AtlasPokemonInfoCard
          selectedPokemon={selectedPokemon}
          onClose={handleClosePokemon}
        />
      </div>
      <Footer shouldCenter />
    </div>
  )
}