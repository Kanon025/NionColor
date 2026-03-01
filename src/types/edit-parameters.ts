// Core edit parameters for the photo editing pipeline
// Each parameter maps to a WebGL shader pass

export interface WhiteBalanceParams {
  temperature: number; // -100 to 100 (Kelvin shift)
  tint: number; // -100 to 100 (green-magenta)
}

export interface ToneParams {
  exposure: number; // -5 to 5 (stops)
  contrast: number; // -100 to 100
  highlights: number; // -100 to 100
  shadows: number; // -100 to 100
  whites: number; // -100 to 100
  blacks: number; // -100 to 100
}

export interface PresenceParams {
  clarity: number; // -100 to 100
  vibrance: number; // -100 to 100
  saturation: number; // -100 to 100
}

export interface ToneCurvePoint {
  x: number; // 0-1
  y: number; // 0-1
}

export interface ToneCurveParams {
  rgb: ToneCurvePoint[];
  red: ToneCurvePoint[];
  green: ToneCurvePoint[];
  blue: ToneCurvePoint[];
}

export interface HSLChannel {
  hue: number; // -180 to 180
  saturation: number; // -100 to 100
  luminance: number; // -100 to 100
}

export interface HSLParams {
  red: HSLChannel;
  orange: HSLChannel;
  yellow: HSLChannel;
  green: HSLChannel;
  aqua: HSLChannel;
  blue: HSLChannel;
  purple: HSLChannel;
  magenta: HSLChannel;
}

export interface ColorWheelValue {
  hue: number; // 0-360
  saturation: number; // 0-100
  luminance: number; // -100 to 100
}

export interface ColorGradingParams {
  shadows: ColorWheelValue;
  midtones: ColorWheelValue;
  highlights: ColorWheelValue;
}

export interface DetailParams {
  sharpening: number; // 0 to 150
  grain: number; // 0 to 100
  grainSize: number; // 0 to 100
}

export interface EffectsParams {
  vignette: number; // -100 to 100
  vignetteFeather: number; // 0 to 100
}

export interface EditParameters {
  whiteBalance: WhiteBalanceParams;
  tone: ToneParams;
  presence: PresenceParams;
  toneCurve: ToneCurveParams;
  hsl: HSLParams;
  colorGrading: ColorGradingParams;
  detail: DetailParams;
  effects: EffectsParams;
}

export const DEFAULT_CURVE: ToneCurvePoint[] = [
  { x: 0, y: 0 },
  { x: 1, y: 1 },
];

export const DEFAULT_HSL_CHANNEL: HSLChannel = {
  hue: 0,
  saturation: 0,
  luminance: 0,
};

export const DEFAULT_COLOR_WHEEL: ColorWheelValue = {
  hue: 0,
  saturation: 0,
  luminance: 0,
};

export const DEFAULT_EDIT_PARAMETERS: EditParameters = {
  whiteBalance: { temperature: 0, tint: 0 },
  tone: {
    exposure: 0,
    contrast: 0,
    highlights: 0,
    shadows: 0,
    whites: 0,
    blacks: 0,
  },
  presence: { clarity: 0, vibrance: 0, saturation: 0 },
  toneCurve: {
    rgb: [...DEFAULT_CURVE],
    red: [...DEFAULT_CURVE],
    green: [...DEFAULT_CURVE],
    blue: [...DEFAULT_CURVE],
  },
  hsl: {
    red: { ...DEFAULT_HSL_CHANNEL },
    orange: { ...DEFAULT_HSL_CHANNEL },
    yellow: { ...DEFAULT_HSL_CHANNEL },
    green: { ...DEFAULT_HSL_CHANNEL },
    aqua: { ...DEFAULT_HSL_CHANNEL },
    blue: { ...DEFAULT_HSL_CHANNEL },
    purple: { ...DEFAULT_HSL_CHANNEL },
    magenta: { ...DEFAULT_HSL_CHANNEL },
  },
  colorGrading: {
    shadows: { ...DEFAULT_COLOR_WHEEL },
    midtones: { ...DEFAULT_COLOR_WHEEL },
    highlights: { ...DEFAULT_COLOR_WHEEL },
  },
  detail: { sharpening: 0, grain: 0, grainSize: 50 },
  effects: { vignette: 0, vignetteFeather: 50 },
};
