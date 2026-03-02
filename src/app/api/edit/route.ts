import { NextResponse } from "next/server";
import OpenAI from "openai";
import type { EditParameters } from "@/types/edit-parameters";

let _client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  }
  return _client;
}

const SYSTEM_PROMPT = `Eres un asistente experto en edición fotográfica profesional integrado en NionColor, un editor de fotos no destructivo. Tu rol es interpretar instrucciones de edición en lenguaje natural (en español o inglés) y traducirlas a ajustes precisos de parámetros.

Tienes conocimiento PROFESIONAL de colorimetría, exposición, balance de blancos, curvas de tono, y post-producción fotográfica. Cuando un usuario describe un problema visual, debes diagnosticar la causa técnica correcta:

- "Foto oscura" → analiza si falta exposición general, o si las sombras están aplastadas (shadows), o si los negros están demasiado bajos (blacks). Una foto puede ser oscura por múltiples razones.
- "Foto lavada/descolorida" → podría ser baja saturación, bajo contraste, o highlights soplados.
- "Colores raros" → revisa temperature/tint primero, luego HSL específico.
- "Falta detalle" → puede ser sharpening, clarity, o shadows/highlights comprimidos.
- "Piel con mal tono" → ajusta orange/yellow en HSL, temperatura, y tint.

PARÁMETROS DISPONIBLES:

**White Balance (whiteBalance)**
- temperature: -100 a 100 (negativo = frío/azulado, positivo = cálido/amarillento). Afecta el eje azul-ámbar del color.
- tint: -100 a 100 (negativo = verdoso, positivo = magenta). Eje perpendicular a la temperatura.

**Tono (tone)**
- exposure: -5 a 5 (pasos de exposición). Ajuste global de luminosidad. Cada stop duplica/divide la luz. Cambios sutiles entre -1 y 1.
- contrast: -100 a 100. Separa tonos medios - positivo da más "punch", negativo da look más plano/mate.
- highlights: -100 a 100. Afecta las zonas más brillantes. Negativo = recuperar cielos soplados, detalles en luces altas. Positivo = intensificar brillo en zonas claras.
- shadows: -100 a 100. Afecta las zonas oscuras. Positivo = abrir/revelar detalle en sombras. Negativo = profundizar sombras.
- whites: -100 a 100. Punto blanco. Ajusta el extremo superior del histograma. Diferente de highlights: whites afecta los valores más extremos.
- blacks: -100 a 100. Punto negro. Positivo = levantar negros (look "fade"/mate). Negativo = profundizar negros (más contraste).

**Presencia (presence)**
- clarity: -100 a 100. Contraste de medios tonos / textura. Positivo = más definición y "grit". Negativo = efecto suave/glow.
- vibrance: -100 a 100. Saturación inteligente: boostea colores poco saturados sin afectar tonos de piel o colores ya saturados.
- saturation: -100 a 100. Saturación global uniforme. Más agresiva que vibrance.

**Curva de Tonos (toneCurve)**
- rgb, red, green, blue: arrays de puntos {x: 0-1, y: 0-1}
- Mínimo 2 puntos (inicio y fin). Usa puntos intermedios para curvas S (contraste), fade (levantar punto negro), cross-processing, etc.

**HSL (hsl)** - por canal: red, orange, yellow, green, aqua, blue, purple, magenta
- hue: -180 a 180 (rotación de matiz)
- saturation: -100 a 100 (saturar/desaturar ese color específico)
- luminance: -100 a 100 (aclarar/oscurecer ese color)

**Color Grading (colorGrading)** - por zona tonal: shadows, midtones, highlights
- hue: 0 a 360 (matiz del tinte a aplicar)
- saturation: 0 a 100 (intensidad del tinte)
- luminance: -100 a 100

**Detalle (detail)**
- sharpening: 0 a 150. Enfoque/nitidez. 30-60 es normal, >100 es agresivo.
- grain: 0 a 100. Grano de película. 15-30 es sutil, >50 es pronunciado.
- grainSize: 0 a 100. Tamaño del grano.

**Efectos (effects)**
- vignette: -100 a 100. Negativo = oscurece bordes (viñeteo clásico). Positivo = aclara bordes.
- vignetteFeather: 0 a 100. Suavidad de la transición del viñeteo.

INTERPRETACIÓN DE LENGUAJE RELATIVO:
- "un poco", "ligeramente", "sutilmente" = cambio del 15-25% del rango
- "bastante", "considerablemente" = cambio del 40-60% del rango
- "mucho", "fuertemente", "al máximo" = cambio del 60-80% del rango
- "más X" = aumentar desde el valor actual
- "menos X" = disminuir desde el valor actual
- Los valores en currentParameters son los valores ACTUALES. Aplica cambios RELATIVOS sobre ellos.

PRESETS/LOOKS COMUNES:
- "cinematográfico/cinematic": sombras cálidas (colorGrading shadows hue ~35, sat ~25), highlights teal (hue ~190, sat ~20), saturación baja (-15 a -25), negros levantados (blacks +15 a +25), contraste medio-alto (+20 a +35), clarity +10-20, vignette -15
- "film/analógico/película": negros levantados (blacks +20), tonos cálidos (temperature +10-15), grano (grain 25-40, grainSize 40-60), viñeta suave (vignette -20, feather 60), leve desaturación
- "moody/dramático": exposición baja (-0.3 a -0.7), contraste alto (+30 a +50), desaturado (saturation -20 a -40), clarity alto (+25 a +40), vignette fuerte
- "bright and airy/luminoso": exposición alta (+0.5 a +1), sombras abiertas (shadows +40 a +60), highlights -20, baja saturación, temperatura ligeramente cálida
- "vintage/retro": fade (blacks +25-35), temperatura cálida (+15-25), saturación baja, tinte en sombras (hue ~40-50, sat 20-30)
- "blanco y negro/B&W": saturation -100, ajustar luminance HSL por canal para contraste tonal creativo

MODO AUTO-MEJORA:
Cuando el usuario pida "mejorar", "auto", "arreglar", o "optimizar" sin instrucción específica:
1. Analiza los parámetros actuales para detectar qué está "flat" o sin ajustar.
2. Si TODOS los parámetros están en 0/default, la imagen probablemente es un RAW sin procesar. Los RAW salen planos, sin curva de tono, oscuros y desaturados. En este caso, aplica una corrección más fuerte:
   - exposure: +0.7 a +1.2 (los RAW suelen necesitar más)
   - contrast: +25 a +40
   - highlights: -20 a -35
   - shadows: +30 a +50 (abrir bastante las sombras)
   - whites: +10 a +20
   - blacks: -5 a -15
   - clarity: +15 a +25
   - vibrance: +20 a +30
   - saturation: +5 a +10
   - sharpening: 30 a 50
3. Si ya hay parámetros ajustados, aplica una corrección más conservadora sobre los valores existentes:
   - exposure: +0.3 a +0.5 si parece oscura
   - contrast: +15-25
   - shadows: +15-25
   - highlights: -10-20
   - clarity: +10-15
   - vibrance: +10-15
4. Cuando el usuario dice "la foto está oscura/muy oscura" sin más, sé agresivo con la exposición (+1 a +2), sombras (+40 a +60) y contraste (+20 a +30). No apliques cambios tímidos.

REGLAS:
1. Responde SIEMPRE con un JSON válido que contenga "parameters" y "explanation".
2. Solo incluye los parámetros que necesitas cambiar, no todos.
3. Explica brevemente qué cambiaste y por qué, en español.
4. Si el usuario pide algo ambiguo, haz tu mejor interpretación profesional.
5. Si el usuario pide deshacer o resetear, devuelve los valores en 0/default.
6. IMPORTANTE: El campo "parameters" debe ser un objeto con las secciones como keys (whiteBalance, tone, presence, etc.) y solo los campos cambiados.`;

const TOOL_SCHEMA = {
  type: "object" as const,
  properties: {
    parameters: {
      type: "object",
      description: "Los parámetros de edición a cambiar. Solo incluir los que cambian.",
      properties: {
        whiteBalance: {
          type: "object",
          properties: {
            temperature: { type: "number" },
            tint: { type: "number" },
          },
        },
        tone: {
          type: "object",
          properties: {
            exposure: { type: "number" },
            contrast: { type: "number" },
            highlights: { type: "number" },
            shadows: { type: "number" },
            whites: { type: "number" },
            blacks: { type: "number" },
          },
        },
        presence: {
          type: "object",
          properties: {
            clarity: { type: "number" },
            vibrance: { type: "number" },
            saturation: { type: "number" },
          },
        },
        detail: {
          type: "object",
          properties: {
            sharpening: { type: "number" },
            grain: { type: "number" },
            grainSize: { type: "number" },
          },
        },
        effects: {
          type: "object",
          properties: {
            vignette: { type: "number" },
            vignetteFeather: { type: "number" },
          },
        },
        hsl: {
          type: "object",
          properties: {
            red: { type: "object", properties: { hue: { type: "number" }, saturation: { type: "number" }, luminance: { type: "number" } } },
            orange: { type: "object", properties: { hue: { type: "number" }, saturation: { type: "number" }, luminance: { type: "number" } } },
            yellow: { type: "object", properties: { hue: { type: "number" }, saturation: { type: "number" }, luminance: { type: "number" } } },
            green: { type: "object", properties: { hue: { type: "number" }, saturation: { type: "number" }, luminance: { type: "number" } } },
            aqua: { type: "object", properties: { hue: { type: "number" }, saturation: { type: "number" }, luminance: { type: "number" } } },
            blue: { type: "object", properties: { hue: { type: "number" }, saturation: { type: "number" }, luminance: { type: "number" } } },
            purple: { type: "object", properties: { hue: { type: "number" }, saturation: { type: "number" }, luminance: { type: "number" } } },
            magenta: { type: "object", properties: { hue: { type: "number" }, saturation: { type: "number" }, luminance: { type: "number" } } },
          },
        },
        colorGrading: {
          type: "object",
          properties: {
            shadows: { type: "object", properties: { hue: { type: "number" }, saturation: { type: "number" }, luminance: { type: "number" } } },
            midtones: { type: "object", properties: { hue: { type: "number" }, saturation: { type: "number" }, luminance: { type: "number" } } },
            highlights: { type: "object", properties: { hue: { type: "number" }, saturation: { type: "number" }, luminance: { type: "number" } } },
          },
        },
      },
    },
    explanation: {
      type: "string",
      description: "Explicación breve en español de qué se cambió y por qué",
    },
  },
  required: ["parameters", "explanation"],
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

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY no configurada. Agrega la variable de entorno en Vercel." },
        { status: 500 }
      );
    }

    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    // Add conversation history (last 10)
    for (const msg of history.slice(-10)) {
      messages.push({ role: msg.role, content: msg.content });
    }

    // Current message with parameter context
    messages.push({
      role: "user",
      content: `[Parámetros actuales: ${JSON.stringify(currentParameters)}]\n\nInstrucción: ${message}`,
    });

    const response = await getClient().chat.completions.create({
      model: "gpt-4o",
      messages,
      tools: [
        {
          type: "function",
          function: {
            name: "adjust_parameters",
            description: "Ajusta los parámetros de edición fotográfica. Solo incluye los parámetros que quieres cambiar.",
            parameters: TOOL_SCHEMA,
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "adjust_parameters" } },
      temperature: 0.3,
    });

    const choice = response.choices[0];
    let parameters: Partial<EditParameters> = {};
    let explanation = "";

    // Extract from tool call
    if (choice.message.tool_calls?.length) {
      const toolCall = choice.message.tool_calls[0];
      try {
        const args = "function" in toolCall ? toolCall.function.arguments : "";
        const parsed = JSON.parse(args);
        parameters = parsed.parameters ?? {};
        explanation = parsed.explanation ?? "Ajustes aplicados.";
      } catch {
        explanation = "Error al interpretar la respuesta del asistente.";
      }
    }

    // Fallback: extract from content
    if (Object.keys(parameters).length === 0 && choice.message.content) {
      try {
        const parsed = JSON.parse(choice.message.content);
        parameters = parsed.parameters ?? {};
        explanation = parsed.explanation ?? choice.message.content;
      } catch {
        explanation = choice.message.content;
      }
    }

    return NextResponse.json({ parameters, explanation });
  } catch (error) {
    console.error("Edit API error:", error);
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
