import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { EditParameters } from "@/types/edit-parameters";

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  }
  return _client;
}

const SYSTEM_PROMPT = `Eres un asistente experto en edición fotográfica profesional integrado en NionColor, un editor de fotos no destructivo. Tu rol es interpretar instrucciones de edición en lenguaje natural (en español o inglés) y traducirlas a ajustes precisos de parámetros.

PARÁMETROS DISPONIBLES:

**White Balance (whiteBalance)**
- temperature: -100 a 100 (negativo = frío/azulado, positivo = cálido/amarillento)
- tint: -100 a 100 (negativo = verdoso, positivo = magenta)

**Tono (tone)**
- exposure: -5 a 5 (pasos de exposición, cambios sutiles entre -1 y 1)
- contrast: -100 a 100
- highlights: -100 a 100 (negativo = recuperar altas luces)
- shadows: -100 a 100 (positivo = abrir sombras)
- whites: -100 a 100 (punto blanco)
- blacks: -100 a 100 (punto negro, positivo = levantar negros/fade)

**Presencia (presence)**
- clarity: -100 a 100 (contraste de medios tonos)
- vibrance: -100 a 100 (saturación inteligente)
- saturation: -100 a 100 (saturación global)

**Curva de Tonos (toneCurve)**
- rgb, red, green, blue: arrays de puntos {x: 0-1, y: 0-1}
- Mínimo 2 puntos (inicio y fin), usa puntos intermedios para curvas S, fade, etc.

**HSL (hsl)** - por canal: red, orange, yellow, green, aqua, blue, purple, magenta
- hue: -180 a 180 (rotación de matiz)
- saturation: -100 a 100
- luminance: -100 a 100

**Color Grading (colorGrading)** - por zona: shadows, midtones, highlights
- hue: 0 a 360 (matiz del tinte)
- saturation: 0 a 100 (intensidad del tinte)
- luminance: -100 a 100

**Detalle (detail)**
- sharpening: 0 a 150
- grain: 0 a 100 (cantidad de grano)
- grainSize: 0 a 100 (tamaño del grano)

**Efectos (effects)**
- vignette: -100 a 100 (negativo = oscurece bordes, positivo = aclara)
- vignetteFeather: 0 a 100 (suavidad del viñeteo)

INTERPRETACIÓN DE LENGUAJE RELATIVO:
- "un poco", "ligeramente", "sutilmente" = cambio del 15-25% del rango
- "bastante", "considerablemente" = cambio del 40-60% del rango
- "mucho", "fuertemente", "al máximo" = cambio del 60-80% del rango
- "más X" = aumentar desde el valor actual
- "menos X" = disminuir desde el valor actual
- Los valores que recibes en currentParameters son los valores ACTUALES, aplica cambios RELATIVOS sobre ellos

PRESETS/LOOKS COMUNES:
- "cinematográfico/cinematic": sombras cálidas (colorGrading shadows hue ~30-40, sat ~25), highlights teal (hue ~190, sat ~20), saturación baja (-15 a -25), negros levantados (blacks +15 a +25), contraste medio-alto (+20 a +35)
- "film/analógico/película": negros levantados (blacks +20), tonos cálidos (temperature +10-15), grano (grain 25-40, grainSize 40-60), viñeta suave (vignette -20, feather 60)
- "moody/dramático": exposición baja (-0.3 a -0.7), contraste alto (+30 a +50), desaturado (saturation -20 a -40), clarity alto (+25 a +40)
- "bright and airy/luminoso": exposición alta (+0.5 a +1), sombras abiertas (shadows +40 a +60), highlights -20, baja saturación, temperatura cálida
- "vintage/retro": fade (blacks +25-35), temperatura cálida (+15-25), saturación baja, tinte en sombras (hue ~40-50, sat 20-30)
- "blanco y negro/B&W": saturation -100, ajustar luminance HSL para contraste tonal

REGLAS:
1. SIEMPRE usa la herramienta adjust_parameters para hacer cambios. Nunca respondas sin llamar a la herramienta.
2. Solo incluye los parámetros que necesitas cambiar, no todos.
3. Explica brevemente qué cambiaste y por qué, en español.
4. Si el usuario pide algo ambiguo, haz tu mejor interpretación profesional.
5. Si el usuario pide deshacer o resetear, devuelve los valores en 0/default.`;

// Full JSON schema for the adjust_parameters tool matching EditParameters
const adjustParametersTool: Anthropic.Tool = {
  name: "adjust_parameters",
  description:
    "Ajusta los parámetros de edición de la foto. Solo incluye los parámetros que quieres cambiar.",
  input_schema: {
    type: "object" as const,
    properties: {
      whiteBalance: {
        type: "object",
        properties: {
          temperature: {
            type: "number",
            minimum: -100,
            maximum: 100,
            description: "Temperatura de color: negativo=frío, positivo=cálido",
          },
          tint: {
            type: "number",
            minimum: -100,
            maximum: 100,
            description: "Tinte: negativo=verde, positivo=magenta",
          },
        },
      },
      tone: {
        type: "object",
        properties: {
          exposure: {
            type: "number",
            minimum: -5,
            maximum: 5,
            description: "Exposición en pasos (stops)",
          },
          contrast: {
            type: "number",
            minimum: -100,
            maximum: 100,
            description: "Contraste global",
          },
          highlights: {
            type: "number",
            minimum: -100,
            maximum: 100,
            description:
              "Altas luces: negativo=recuperar, positivo=intensificar",
          },
          shadows: {
            type: "number",
            minimum: -100,
            maximum: 100,
            description: "Sombras: positivo=abrir/aclarar",
          },
          whites: {
            type: "number",
            minimum: -100,
            maximum: 100,
            description: "Punto blanco",
          },
          blacks: {
            type: "number",
            minimum: -100,
            maximum: 100,
            description:
              "Punto negro: positivo=levantar negros (fade/matte look)",
          },
        },
      },
      presence: {
        type: "object",
        properties: {
          clarity: {
            type: "number",
            minimum: -100,
            maximum: 100,
            description: "Claridad (contraste de medios tonos)",
          },
          vibrance: {
            type: "number",
            minimum: -100,
            maximum: 100,
            description: "Vibrance (saturación inteligente)",
          },
          saturation: {
            type: "number",
            minimum: -100,
            maximum: 100,
            description: "Saturación global",
          },
        },
      },
      toneCurve: {
        type: "object",
        properties: {
          rgb: {
            type: "array",
            items: {
              type: "object",
              properties: {
                x: { type: "number", minimum: 0, maximum: 1 },
                y: { type: "number", minimum: 0, maximum: 1 },
              },
              required: ["x", "y"],
            },
            description: "Curva RGB (luminosidad global)",
          },
          red: {
            type: "array",
            items: {
              type: "object",
              properties: {
                x: { type: "number", minimum: 0, maximum: 1 },
                y: { type: "number", minimum: 0, maximum: 1 },
              },
              required: ["x", "y"],
            },
            description: "Curva canal rojo",
          },
          green: {
            type: "array",
            items: {
              type: "object",
              properties: {
                x: { type: "number", minimum: 0, maximum: 1 },
                y: { type: "number", minimum: 0, maximum: 1 },
              },
              required: ["x", "y"],
            },
            description: "Curva canal verde",
          },
          blue: {
            type: "array",
            items: {
              type: "object",
              properties: {
                x: { type: "number", minimum: 0, maximum: 1 },
                y: { type: "number", minimum: 0, maximum: 1 },
              },
              required: ["x", "y"],
            },
            description: "Curva canal azul",
          },
        },
      },
      hsl: {
        type: "object",
        properties: {
          red: {
            type: "object",
            properties: {
              hue: { type: "number", minimum: -180, maximum: 180 },
              saturation: { type: "number", minimum: -100, maximum: 100 },
              luminance: { type: "number", minimum: -100, maximum: 100 },
            },
          },
          orange: {
            type: "object",
            properties: {
              hue: { type: "number", minimum: -180, maximum: 180 },
              saturation: { type: "number", minimum: -100, maximum: 100 },
              luminance: { type: "number", minimum: -100, maximum: 100 },
            },
          },
          yellow: {
            type: "object",
            properties: {
              hue: { type: "number", minimum: -180, maximum: 180 },
              saturation: { type: "number", minimum: -100, maximum: 100 },
              luminance: { type: "number", minimum: -100, maximum: 100 },
            },
          },
          green: {
            type: "object",
            properties: {
              hue: { type: "number", minimum: -180, maximum: 180 },
              saturation: { type: "number", minimum: -100, maximum: 100 },
              luminance: { type: "number", minimum: -100, maximum: 100 },
            },
          },
          aqua: {
            type: "object",
            properties: {
              hue: { type: "number", minimum: -180, maximum: 180 },
              saturation: { type: "number", minimum: -100, maximum: 100 },
              luminance: { type: "number", minimum: -100, maximum: 100 },
            },
          },
          blue: {
            type: "object",
            properties: {
              hue: { type: "number", minimum: -180, maximum: 180 },
              saturation: { type: "number", minimum: -100, maximum: 100 },
              luminance: { type: "number", minimum: -100, maximum: 100 },
            },
          },
          purple: {
            type: "object",
            properties: {
              hue: { type: "number", minimum: -180, maximum: 180 },
              saturation: { type: "number", minimum: -100, maximum: 100 },
              luminance: { type: "number", minimum: -100, maximum: 100 },
            },
          },
          magenta: {
            type: "object",
            properties: {
              hue: { type: "number", minimum: -180, maximum: 180 },
              saturation: { type: "number", minimum: -100, maximum: 100 },
              luminance: { type: "number", minimum: -100, maximum: 100 },
            },
          },
        },
      },
      colorGrading: {
        type: "object",
        properties: {
          shadows: {
            type: "object",
            properties: {
              hue: { type: "number", minimum: 0, maximum: 360 },
              saturation: { type: "number", minimum: 0, maximum: 100 },
              luminance: { type: "number", minimum: -100, maximum: 100 },
            },
            description: "Tinte de sombras",
          },
          midtones: {
            type: "object",
            properties: {
              hue: { type: "number", minimum: 0, maximum: 360 },
              saturation: { type: "number", minimum: 0, maximum: 100 },
              luminance: { type: "number", minimum: -100, maximum: 100 },
            },
            description: "Tinte de medios tonos",
          },
          highlights: {
            type: "object",
            properties: {
              hue: { type: "number", minimum: 0, maximum: 360 },
              saturation: { type: "number", minimum: 0, maximum: 100 },
              luminance: { type: "number", minimum: -100, maximum: 100 },
            },
            description: "Tinte de altas luces",
          },
        },
      },
      detail: {
        type: "object",
        properties: {
          sharpening: {
            type: "number",
            minimum: 0,
            maximum: 150,
            description: "Enfoque/nitidez",
          },
          grain: {
            type: "number",
            minimum: 0,
            maximum: 100,
            description: "Cantidad de grano",
          },
          grainSize: {
            type: "number",
            minimum: 0,
            maximum: 100,
            description: "Tamaño del grano",
          },
        },
      },
      effects: {
        type: "object",
        properties: {
          vignette: {
            type: "number",
            minimum: -100,
            maximum: 100,
            description: "Viñeteo: negativo=oscurece bordes",
          },
          vignetteFeather: {
            type: "number",
            minimum: 0,
            maximum: 100,
            description: "Suavidad del viñeteo",
          },
        },
      },
    },
  },
};

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface RequestBody {
  message: string;
  currentParameters: EditParameters;
  history: ChatMessage[];
}

export async function POST(req: Request) {
  try {
    const body: RequestBody = await req.json();
    const { message, currentParameters, history } = body;

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY no configurada" },
        { status: 500 }
      );
    }

    // Build conversation messages from history
    const messages: Anthropic.MessageParam[] = [];

    // Add conversation history (last 10 messages)
    for (const msg of history.slice(-10)) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    // Add current user message with context about current parameters
    messages.push({
      role: "user",
      content: `[Parámetros actuales de la foto: ${JSON.stringify(currentParameters)}]\n\nInstrucción del usuario: ${message}`,
    });

    const response = await getClient().messages.create({
      model: "claude-sonnet-4-5-20250514",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: [adjustParametersTool],
      messages,
    });

    // Extract tool use and text from response
    let parameters: Partial<EditParameters> = {};
    let explanation = "";

    for (const block of response.content) {
      if (block.type === "tool_use" && block.name === "adjust_parameters") {
        parameters = block.input as Partial<EditParameters>;
      } else if (block.type === "text") {
        explanation = block.text;
      }
    }

    // If the model used a tool but also needs to provide text explanation,
    // and no text block was found, generate a brief explanation
    if (Object.keys(parameters).length > 0 && !explanation) {
      explanation = "Ajustes aplicados.";
    }

    return NextResponse.json({ parameters, explanation });
  } catch (error) {
    console.error("Edit API error:", error);
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
