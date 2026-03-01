declare module "libraw-wasm" {
  export interface LibRawSettings {
    bright?: number;
    threshold?: number;
    autoBrightThr?: number;
    adjustMaximumThr?: number;
    expShift?: number;
    expPreser?: number;
    halfSize?: boolean;
    fourColorRgb?: boolean;
    highlight?: number;
    useAutoWb?: boolean;
    useCameraWb?: boolean;
    useCameraMatrix?: number;
    outputColor?: number;
    outputBps?: number;
    outputTiff?: boolean;
    outputFlags?: number;
    userFlip?: number;
    userQual?: number;
    userBlack?: number;
    userCblack?: [number, number, number, number];
    userSat?: number;
    medPasses?: number;
    noAutoBright?: boolean;
    useFujiRotate?: number;
    greenMatching?: boolean;
    dcbIterations?: number;
    dcbEnhanceFl?: boolean;
    fbddNoiserd?: number;
    expCorrec?: boolean;
    noAutoScale?: boolean;
    noInterpolation?: boolean;
    greybox?: [number, number, number, number] | null;
    cropbox?: [number, number, number, number] | null;
    aber?: [number, number, number, number] | null;
    gamm?: [number, number] | null;
    userMul?: [number, number, number, number] | null;
    outputProfile?: string | null;
    cameraProfile?: string | null;
    badPixels?: string | null;
    darkFrame?: string | null;
  }

  export interface LibRawMetadata {
    make: string;
    model: string;
    software: string;
    iso_speed: number;
    shutter: number;
    aperture: number;
    focal_len: number;
    timestamp: Date;
    shot_order: number;
    desc: string;
    artist: string;
    raw_width: number;
    raw_height: number;
    width: number;
    height: number;
    top_margin: number;
    left_margin: number;
    flip: number;
    colors: number;
    thumb_format: string;
    thumb_width: number;
    thumb_height: number;
  }

  class LibRaw {
    constructor();
    open(data: Uint8Array, settings?: LibRawSettings): Promise<void>;
    metadata(fullOutput?: boolean): Promise<LibRawMetadata>;
    imageData(): Promise<Uint8Array>;
  }

  export default LibRaw;
}
