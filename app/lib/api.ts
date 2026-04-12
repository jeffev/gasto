import { ParseResult } from "./types";
import { classificarTexto } from "./classifier";

// Usado apenas para transcrição de áudio (Whisper roda no backend)
export const API_URL = "http://192.168.0.3:8000";

/**
 * Processa texto digitado/transcrito offline — sem rede.
 * Usa TF-IDF + LinearSVC embutidos (model.json).
 */
export async function parseTexto(texto: string): Promise<ParseResult> {
  return classificarTexto(texto);
}

export async function transcreverAudio(uri: string): Promise<string> {
  const formData = new FormData();
  formData.append("audio", {
    uri,
    name: "audio.m4a",
    type: "audio/m4a",
  } as any);

  const res = await fetch(`${API_URL}/transcribe`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Erro ao transcrever áudio");
  }
  const data = await res.json();
  return data.texto as string;
}

export async function enviarFeedback(params: {
  texto_original: string;
  categoria_sugerida: string;
  categoria_confirmada: string;
  aceito: boolean;
}): Promise<void> {
  await fetch(`${API_URL}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  }).catch(() => {
    // feedback é best-effort, não bloqueia o fluxo
  });
}
