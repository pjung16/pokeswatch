"use client"
import { useEffect, useRef } from "react"
import positioned from "../positioned.json"

export default function AtlasPageClient() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageCacheRef = useRef<Record<string, HTMLImageElement>>({});

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
    const pokemonList = positioned as {
      data: {
        id: string;
        name: string;
        colorHex: string;
        width: number;
        height: number;
        filename: string;
      };
      x: number;
      y: number;
      width: number;
      height: number;
    }[];
  
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
      await Promise.all(
        positioned.map(async (p) => {
          if (!cache[p.data.name]) {
            const img = await loadImage(`/sprites/normal/${p.data.filename}`);
            cache[p.data.name] = img;
          }
        })
      );
      imageCacheRef.current = cache;

      drawAll(0, 0); // initial draw after all images loaded
    }

    preloadImages();
  }, []);


  useEffect(() => {
    const canvas = document.createElement("canvas");
    canvasRef.current = canvas;
    const ctx = canvas.getContext("2d")!;
  
    canvas.width = 10000;
    canvas.height = 2000;
    canvas.id = "atlas";
    ctx.imageSmoothingEnabled = false;
  
    let offsetX = 0;
    let offsetY = 0;
    let targetOffsetX = 0;
    let targetOffsetY = 0;
    let isPanning = false;
    let startX = 0;
    let startY = 0;
    const smoothing = 0.15;
  
    // Zoom variables
    let scale = 1;
    let targetScale = 1;
    const minScale = 0.1;
    const maxScale = 3;
  
    // --- Mouse events for panning ---
    canvas.addEventListener("mousedown", (e) => {
      isPanning = true;
      startX = e.clientX - targetOffsetX;
      startY = e.clientY - targetOffsetY;
    });
  
    canvas.addEventListener("mousemove", (e) => {
      if (!isPanning) return;
      targetOffsetX = e.clientX - startX;
      targetOffsetY = e.clientY - startY;
    });
  
    canvas.addEventListener("mouseup", () => { isPanning = false; });
    canvas.addEventListener("mouseleave", () => { isPanning = false; });
  
    // --- Wheel for zooming ---
    canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
  
      const zoomFactor = 0.05;
      const mouseX = e.clientX;
      const mouseY = e.clientY;
  
      const delta = -e.deltaY; // normalize trackpad scroll direction
      if (delta === 0) return;
  
      // Calculate new target scale
      const newScale = Math.min(Math.max(targetScale + (delta > 0 ? zoomFactor : -zoomFactor), minScale), maxScale);
  
      // Adjust target offsets so zoom is relative to mouse
      const scaleRatio = newScale / targetScale;
      targetOffsetX = mouseX - (mouseX - targetOffsetX) * scaleRatio;
      targetOffsetY = mouseY - (mouseY - targetOffsetY) * scaleRatio;
  
      targetScale = newScale;
    });
  
    // --- Add canvas to DOM ---
    const container = document.getElementById("atlas-page-client");
    container?.appendChild(canvas);
  
    // --- Draw function (apply both pan and zoom) ---
    function drawAll(offsetX: number, offsetY: number, scale: number) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);
  
      for (const p of positioned) {
        const img = imageCacheRef.current[p.data.name];
        if (img) {
          ctx.drawImage(img, p.x, p.y, p.width, p.height);
        }
      }
  
      ctx.restore();
    }
  
    // --- Animation frame loop ---
    let animationFrameId: number;
    const animate = () => {
      // Smoothly interpolate pan
      offsetX += (targetOffsetX - offsetX) * smoothing;
      offsetY += (targetOffsetY - offsetY) * smoothing;
  
      // Smoothly interpolate zoom
      scale += (targetScale - scale) * smoothing;
  
      drawAll(offsetX, offsetY, scale);
  
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();
  
    // --- Cleanup ---
    return () => {
      canvas.removeEventListener("mousedown", () => {});
      canvas.removeEventListener("mousemove", () => {});
      canvas.removeEventListener("mouseup", () => {});
      canvas.removeEventListener("mouseleave", () => {});
      canvas.removeEventListener("wheel", () => {});
      cancelAnimationFrame(animationFrameId);
      container?.removeChild(canvas);
    };
  }, []);    

  return (
    <div id="atlas-page-client">
        <div>AtlasPageClient</div>
    </div>
  )
}