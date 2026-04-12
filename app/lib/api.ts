import { ParseResult } from "./types";
import { classificarTexto } from "./classifier";
import { transcreverOffline, WhisperStatus } from "./whisper";

// Backend legado — usado apenas como fallback manual se necessário
export const API_URL = "http://192.168.0.3:8000";

/**
 * Processa texto digitado/transcrito offline — sem rede.
 * Usa TF-IDF + LinearSVC embutidos (model.json).
 */
export async function parseTexto(texto: string): Promise<ParseResult> {
  return classificarTexto(texto);
}

/**
 * Transcreve áudio usando Whisper tiny rodando localmente no dispositivo.
 * Na primeira chamada, baixa o modelo (~75 MB) e o mantém em cache.
 */
export async function transcreverAudio(
  uri: string,
  onStatus: (s: WhisperStatus) => void
): Promise<string> {
  return transcreverOffline(uri, onStatus);
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
