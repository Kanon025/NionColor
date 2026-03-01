"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { isRawFile, decodeRawFile } from "@/lib/raw/decoder";

interface ImageState {
  file: File | null;
  imageBitmap: ImageBitmap | null;
  fileName: string;
  dimensions: { width: number; height: number };
  isRaw: boolean;
  loading: boolean;
  error: string | null;
}

interface ImageContextValue extends ImageState {
  loadImage: (file: File) => Promise<void>;
  clearImage: () => void;
}

const initialState: ImageState = {
  file: null,
  imageBitmap: null,
  fileName: "",
  dimensions: { width: 0, height: 0 },
  isRaw: false,
  loading: false,
  error: null,
};

const ImageContext = createContext<ImageContextValue | null>(null);

export function ImageProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ImageState>(initialState);

  const loadImage = useCallback(async (file: File) => {
    const raw = isRawFile(file);

    setState((prev) => ({
      ...prev,
      loading: true,
      error: null,
      fileName: file.name,
    }));

    try {
      let bitmap: ImageBitmap;
      let width: number;
      let height: number;

      if (raw) {
        const decoded = await decodeRawFile(file);
        bitmap = decoded.imageBitmap;
        width = decoded.width;
        height = decoded.height;
      } else {
        bitmap = await createImageBitmap(file);
        width = bitmap.width;
        height = bitmap.height;
      }

      setState({
        file,
        imageBitmap: bitmap,
        fileName: file.name,
        dimensions: { width, height },
        isRaw: raw,
        loading: false,
        error: null,
      });
    } catch (e) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: e instanceof Error ? e.message : "Failed to load image",
      }));
    }
  }, []);

  const clearImage = useCallback(() => {
    if (state.imageBitmap) {
      state.imageBitmap.close();
    }
    setState(initialState);
  }, [state.imageBitmap]);

  return (
    <ImageContext value={{ ...state, loadImage, clearImage }}>
      {children}
    </ImageContext>
  );
}

export function useImageContext(): ImageContextValue {
  const ctx = useContext(ImageContext);
  if (!ctx) {
    throw new Error("useImageContext must be used within an ImageProvider");
  }
  return ctx;
}
