import { GoogleGenAI } from '@google/genai';

let ai: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!ai) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY no configurada');
    ai = new GoogleGenAI({ apiKey: key });
  }
  return ai;
}

export async function scanPlateFromImage(base64Image: string): Promise<string | null> {
  try {
    const client = getClient();
    const imageData = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

    const response = await client.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: imageData,
          },
        },
        {
          text: `Analiza esta imagen y extrae el número de placa vehicular peruana.
Las placas peruanas tienen el formato: ABC-123 o A1B-234 (3 letras/números, guion, 3 números).
Responde ÚNICAMENTE con el número de placa en mayúsculas con guion (ej: ABC-123).
Si no hay placa visible o no puedes leerla con certeza, responde exactamente: NONE`,
        },
      ],
    });

    const raw = response.text?.trim().toUpperCase() || 'NONE';
    // Validate Peruvian plate format
    const match = raw.match(/[A-Z0-9]{3}-?[A-Z0-9]{3}/);
    if (!match || raw === 'NONE') return null;

    // Normalize with dash
    const plate = match[0].replace(/(.{3})(.{3})/, '$1-$2');
    return plate;
  } catch (error) {
    console.error('Error en escaneo de placa:', error);
    return null;
  }
}
