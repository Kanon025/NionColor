"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload } from "lucide-react";
import { useEditContext } from "@/contexts/EditContext";
import { useImageContext } from "@/contexts/ImageContext";
import { WebGLRenderer } from "@/lib/webgl/renderer";

export function Viewport() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { params } = useEditContext();
  const { imageBitmap, loadImage } = useImageContext();

  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const isPanningRef = useRef(false);
  const spaceDownRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });

  // Initialize renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new WebGLRenderer();
    try {
      renderer.init(canvas);
      rendererRef.current = renderer;
    } catch (e) {
      console.error("Failed to initialize WebGL renderer:", e);
    }

    return () => {
      renderer.destroy();
      rendererRef.current = null;
    };
  }, []);

  // Load image into renderer
  useEffect(() => {
    if (rendererRef.current && imageBitmap) {
      rendererRef.current.loadImage(imageBitmap);
      setZoom(1);
      setPanX(0);
      setPanY(0);
    }
  }, [imageBitmap]);

  // Re-render on param or transform changes
  useEffect(() => {
    if (rendererRef.current && imageBitmap) {
      rendererRef.current.setTransform(zoom, panX, panY);
      rendererRef.current.render(params);
    }
  }, [params, imageBitmap, zoom, panX, panY]);

  // Resize canvas
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      canvas.width = width * devicePixelRatio;
      canvas.height = height * devicePixelRatio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      if (rendererRef.current && imageBitmap) {
        rendererRef.current.render(params);
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [imageBitmap, params]);

  // Wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom((z) => Math.min(10, Math.max(0.1, z * factor)));
    },
    []
  );

  // Pan handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1 || (e.button === 0 && spaceDownRef.current)) {
        isPanningRef.current = true;
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
        e.preventDefault();
      }
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanningRef.current) return;
      const dx = e.clientX - lastMouseRef.current.x;
      const dy = e.clientY - lastMouseRef.current.y;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      setPanX((p) => p + dx);
      setPanY((p) => p + dy);
    },
    []
  );

  const handleMouseUp = useCallback(() => {
    isPanningRef.current = false;
  }, []);

  // Space key for pan mode
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) {
        spaceDownRef.current = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spaceDownRef.current = false;
        isPanningRef.current = false;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  // Dropzone
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        loadImage(acceptedFiles[0]);
      }
    },
    [loadImage]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/jpeg": [], "image/png": [] },
    noClick: !!imageBitmap,
    noKeyboard: true,
    multiple: false,
  });

  return (
    <div
      ref={containerRef}
      className="relative flex-1 h-full overflow-hidden bg-background"
      {...getRootProps()}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ cursor: spaceDownRef.current ? "grab" : "default" }}
    >
      <input {...getInputProps()} />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />
      {!imageBitmap && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 pointer-events-none">
          <div
            className={`flex flex-col items-center gap-3 p-8 rounded-xl border-2 border-dashed transition-colors ${
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25"
            }`}
          >
            <Upload className="size-10 text-muted-foreground" />
            <div className="text-center">
              <p className="text-sm text-foreground font-medium">
                Drop an image here
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                or click to browse (JPEG, PNG)
              </p>
            </div>
          </div>
        </div>
      )}
      {isDragActive && imageBitmap && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 pointer-events-none">
          <div className="flex flex-col items-center gap-3 p-8 rounded-xl border-2 border-dashed border-primary">
            <Upload className="size-10 text-primary" />
            <p className="text-sm text-foreground font-medium">
              Drop to replace image
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
