// White balance fragment shader using Bradford chromatic adaptation
// temperature: Kelvin shift (-100 to 100)
// tint: green-magenta shift (-100 to 100)

export const WHITE_BALANCE_SHADER = /* glsl */ `#version 300 es
precision highp float;

in vec2 vUV;
out vec4 fragColor;

uniform sampler2D uTexture;
uniform float uTemperature; // -100 to 100
uniform float uTint;        // -100 to 100

// sRGB to linear
vec3 srgbToLinear(vec3 c) {
  return mix(
    c / 12.92,
    pow((c + 0.055) / 1.055, vec3(2.4)),
    step(0.04045, c)
  );
}

// linear to sRGB
vec3 linearToSrgb(vec3 c) {
  return mix(
    c * 12.92,
    1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055,
    step(0.0031308, c)
  );
}

// Bradford matrix: XYZ → LMS
const mat3 BRADFORD = mat3(
   0.8951,  0.2664, -0.1614,
  -0.7502,  1.7135,  0.0367,
   0.0389, -0.0685,  1.0296
);

const mat3 BRADFORD_INV = mat3(
   0.9870, -0.1471,  0.1600,
   0.4323,  0.5184,  0.0493,
  -0.0085,  0.0400,  0.9685
);

// sRGB to XYZ (D65)
const mat3 SRGB_TO_XYZ = mat3(
  0.4124564, 0.3575761, 0.1804375,
  0.2126729, 0.7151522, 0.0721750,
  0.0193339, 0.1191920, 0.9503041
);

const mat3 XYZ_TO_SRGB = mat3(
   3.2404542, -1.5371385, -0.4985314,
  -0.9692660,  1.8760108,  0.0415560,
   0.0556434, -0.2040259,  1.0572252
);

// D65 white point
const vec3 D65 = vec3(0.95047, 1.0, 1.08883);

// Convert temperature offset to a target white point shift
vec3 temperatureToWhitePoint(float temp, float tint) {
  // Map temperature (-100..100) to a color temperature shift
  // Negative = cooler (blue), Positive = warmer (yellow)
  float t = temp / 100.0;
  float g = tint / 100.0;

  // Shift the white point in xy chromaticity
  vec3 wp = D65;
  wp.x += t * 0.05;    // shift towards yellow/blue
  wp.z -= t * 0.05;    // compensate Z
  wp.y += g * 0.02;    // tint on green-magenta axis
  wp.x -= g * 0.02;

  return wp;
}

void main() {
  vec4 texel = texture(uTexture, vUV);
  vec3 color = texel.rgb;

  // Convert to linear
  color = srgbToLinear(color);

  // sRGB linear → XYZ
  vec3 xyz = color * SRGB_TO_XYZ;

  // XYZ → LMS (Bradford)
  vec3 srcLMS = xyz * BRADFORD;

  // Source white in LMS (D65)
  vec3 srcWhiteLMS = D65 * BRADFORD;

  // Target white point based on temperature/tint
  vec3 targetWP = temperatureToWhitePoint(uTemperature, uTint);
  vec3 dstWhiteLMS = targetWP * BRADFORD;

  // Chromatic adaptation: scale LMS
  vec3 adaptedLMS = srcLMS * (dstWhiteLMS / srcWhiteLMS);

  // LMS → XYZ
  vec3 adaptedXYZ = adaptedLMS * BRADFORD_INV;

  // XYZ → sRGB linear
  color = adaptedXYZ * XYZ_TO_SRGB;

  // Clamp to valid range
  color = max(color, vec3(0.0));

  // Convert back to sRGB
  color = linearToSrgb(color);

  fragColor = vec4(color, texel.a);
}
`;
