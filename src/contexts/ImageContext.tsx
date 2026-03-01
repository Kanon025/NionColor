"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

interface ImageState {
  file: File | null;
  imageBitmap: ImageBitmap | null;
  fileName: string;
  dimensions: { width: number; height: number };
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
};

const ImageContext = createContext<ImageContextValue | null>(null);

export function ImageProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ImageState>(initialState);

  const loadImage = useCallback(async (file: File) => {
    const bitmap = await createImageBitmap(file);
    setState({
      file,
      imageBitmap: bitmap,
      fileName: file.name,
      dimensions: { width: bitmap.width, height: bitmap.height },
    });
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
